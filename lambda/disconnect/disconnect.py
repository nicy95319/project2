import json
import logging
import os
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ["TABLE_NAME"]

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


def _broadcast_leave(connection_id: str, callsign: str, domain: str, stage: str) -> None:
    endpoint_url = f"https://{domain}/{stage}"
    apigw = boto3.client("apigatewaymanagementapi", endpoint_url=endpoint_url)

    payload = json.dumps({
        "type": "system",
        "event": "user_left",
        "callsign": callsign,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }).encode("utf-8")

    try:
        connections = table.scan(ProjectionExpression="connectionId")["Items"]
    except ClientError as e:
        logger.error("Scan failed during leave broadcast: %s", e)
        return

    for conn in connections:
        cid = conn["connectionId"]
        if cid == connection_id:
            continue
        try:
            apigw.post_to_connection(ConnectionId=cid, Data=payload)
        except apigw.exceptions.GoneException:
            try:
                table.delete_item(Key={"connectionId": cid})
            except ClientError:
                pass
        except Exception as e:
            logger.error("Failed to notify %s of leave: %s", cid, e)


def handler(event: dict, context) -> dict:
    try:
        ctx = event["requestContext"]
        connection_id: str = ctx["connectionId"]
        domain: str = ctx.get("domainName", "")
        stage: str = ctx.get("stage", "prod")

        # Read callsign before deletion so we can broadcast
        try:
            response = table.get_item(Key={"connectionId": connection_id})
            callsign: str = response.get("Item", {}).get("callsign", "unknown")
        except ClientError as e:
            logger.error("GetItem failed for %s: %s", connection_id, e)
            callsign = "unknown"

        table.delete_item(Key={"connectionId": connection_id})
        logger.info("Disconnected: connectionId=%s callsign=%s", connection_id, callsign)

        _broadcast_leave(connection_id, callsign, domain, stage)

        return {"statusCode": 200, "body": "Disconnected"}

    except ClientError as e:
        logger.error("DynamoDB error: %s", e)
        return {"statusCode": 500, "body": "Internal server error"}
    except Exception as e:
        logger.error("Unexpected error: %s", e)
        return {"statusCode": 500, "body": "Internal server error"}
