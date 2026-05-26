import json
import logging
import os
import re
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ["TABLE_NAME"]
CALLSIGN_RE = re.compile(r"^[a-zA-Z0-9_]{1,20}$")

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


def _broadcast_join(connection_id: str, callsign: str, domain: str, stage: str) -> None:
    endpoint_url = f"https://{domain}/{stage}"
    apigw = boto3.client("apigatewaymanagementapi", endpoint_url=endpoint_url)

    payload = json.dumps({
        "type": "system",
        "event": "user_joined",
        "callsign": callsign,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }).encode("utf-8")

    try:
        connections = table.scan(ProjectionExpression="connectionId")["Items"]
    except ClientError as e:
        logger.error("Scan failed during join broadcast: %s", e)
        return

    for conn in connections:
        cid = conn["connectionId"]
        if cid == connection_id:
            continue  # don't send join notification to the joining user
        try:
            apigw.post_to_connection(ConnectionId=cid, Data=payload)
        except apigw.exceptions.GoneException:
            try:
                table.delete_item(Key={"connectionId": cid})
            except ClientError:
                pass
        except Exception as e:
            logger.error("Failed to notify %s of join: %s", cid, e)


def handler(event: dict, context) -> dict:
    try:
        ctx = event["requestContext"]
        connection_id: str = ctx["connectionId"]
        domain: str = ctx.get("domainName", "")
        stage: str = ctx.get("stage", "prod")

        qs = event.get("queryStringParameters") or {}
        callsign: str = qs.get("callsign", "")

        if not callsign or not CALLSIGN_RE.match(callsign):
            logger.warning("Invalid callsign=%r for connection %s", callsign, connection_id)
            return {"statusCode": 400, "body": "Invalid or missing callsign"}

        table.put_item(Item={
            "connectionId": connection_id,
            "callsign": callsign,
            "connectedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        })
        logger.info("Connected: connectionId=%s callsign=%s", connection_id, callsign)

        _broadcast_join(connection_id, callsign, domain, stage)

        return {"statusCode": 200, "body": "Connected"}

    except ClientError as e:
        logger.error("DynamoDB error: %s", e)
        return {"statusCode": 500, "body": "Internal server error"}
    except Exception as e:
        logger.error("Unexpected error: %s", e)
        return {"statusCode": 500, "body": "Internal server error"}
