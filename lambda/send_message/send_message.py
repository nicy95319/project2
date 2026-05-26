import json
import logging
import os
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ["TABLE_NAME"]
MAX_TEXT_LEN = 1000

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


def _scan_all_connections() -> list[dict]:
    connections: list[dict] = []
    scan_kwargs: dict = {"ProjectionExpression": "connectionId"}
    while True:
        response = table.scan(**scan_kwargs)
        connections.extend(response["Items"])
        last_key = response.get("LastEvaluatedKey")
        if not last_key:
            break
        scan_kwargs["ExclusiveStartKey"] = last_key
    return connections


def handler(event: dict, context) -> dict:
    try:
        ctx = event["requestContext"]
        connection_id: str = ctx["connectionId"]
        domain: str = ctx["domainName"]
        stage: str = ctx["stage"]

        # Parse and validate body
        try:
            body = json.loads(event.get("body") or "{}")
        except (json.JSONDecodeError, TypeError):
            return {"statusCode": 400, "body": "Invalid JSON body"}

        text = body.get("text")
        if not text or not isinstance(text, str) or not text.strip():
            return {"statusCode": 400, "body": "Missing or invalid text"}
        if len(text) > MAX_TEXT_LEN:
            return {"statusCode": 400, "body": "Message too long (max 1000 characters)"}

        # Get sender's callsign from DynamoDB
        try:
            response = table.get_item(Key={"connectionId": connection_id})
        except ClientError as e:
            logger.error("GetItem failed for %s: %s", connection_id, e)
            return {"statusCode": 500, "body": "Internal server error"}

        sender = response.get("Item")
        if not sender:
            logger.warning("Unknown sender connectionId=%s", connection_id)
            return {"statusCode": 400, "body": "Unknown sender"}

        callsign: str = sender["callsign"]

        # Build broadcast payload
        payload = json.dumps({
            "type": "message",
            "callsign": callsign,
            "text": text,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }).encode("utf-8")

        # Scan all active connections
        try:
            connections = _scan_all_connections()
        except ClientError as e:
            logger.error("Scan failed: %s", e)
            return {"statusCode": 500, "body": "Internal server error"}

        # Fan-out: post to all connections
        endpoint_url = f"https://{domain}/{stage}"
        apigw = boto3.client("apigatewaymanagementapi", endpoint_url=endpoint_url)

        for conn in connections:
            cid = conn["connectionId"]
            try:
                apigw.post_to_connection(ConnectionId=cid, Data=payload)
            except apigw.exceptions.GoneException:
                logger.info("Removing stale connection: %s", cid)
                try:
                    table.delete_item(Key={"connectionId": cid})
                except ClientError:
                    pass
            except Exception as e:
                logger.error("Failed to send to %s: %s", cid, e)

        logger.info("Message broadcast from %s (%s) to %d connections",
                    callsign, connection_id, len(connections))
        return {"statusCode": 200, "body": "Message sent"}

    except Exception as e:
        logger.error("Unexpected error: %s", e)
        return {"statusCode": 500, "body": "Internal server error"}
