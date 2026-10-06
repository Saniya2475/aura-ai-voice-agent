import os
import json

from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv

from google import genai
from google.genai import types


# =========================================================
# LOAD ENVIRONMENT
# =========================================================

load_dotenv()


# =========================================================
# FLASK APP
# =========================================================

app = Flask(__name__)


# =========================================================
# GEMINI CONFIGURATION
# =========================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is missing from .env")


client = genai.Client(api_key=GEMINI_API_KEY)


# Primary + fallback models
# Primary + fallback models
PRIMARY_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
FALLBACK_MODEL = "gemini-2.5-pro"

# =========================================================
# LOAD ORDERS
# =========================================================

with open("data/orders.json", "r", encoding="utf-8") as f:
    ORDERS = json.load(f)


# =========================================================
# ORDER TOOL
# =========================================================

def get_order_details(order_id: str) -> dict:
    """
    Retrieve order details from Aura Skincare's mock order database.
    """

    if not order_id:
        return {
            "found": False,
            "message": "Order ID was not provided."
        }

    order_id = str(order_id).upper().strip()

    # Handle common speech-recognition mistakes

    # OD101 -> ORD-101
    if order_id.startswith("OD"):
        order_id = "ORD" + order_id[2:]

    # O D 101 -> ORD-101
    if order_id.startswith("O D"):
        order_id = "ORD" + order_id[3:].strip()

    # ORDER 101 -> ORD-101
    if order_id.startswith("ORDER"):
        remaining = order_id[5:].strip()

        if remaining.startswith("-"):
            order_id = "ORD" + remaining
        else:
            order_id = "ORD-" + remaining

    # 101 -> ORD-101
    if order_id.isdigit():
        order_id = "ORD-" + order_id

    # ORD101 -> ORD-101
    if order_id.startswith("ORD") and not order_id.startswith("ORD-"):
        number = order_id[3:].strip()

        if number.isdigit():
            order_id = "ORD-" + number

    print("TOOL: Looking up order:", order_id)

    if order_id in ORDERS:

        print("TOOL: Order found:", order_id)

        return {
            "found": True,
            "order": ORDERS[order_id]
        }

    print("TOOL: Order not found:", order_id)

    return {
        "found": False,
        "message": f"No order was found with order ID {order_id}."
    }


# =========================================================
# CANCELLATION TOOL
# =========================================================

def cancel_order(order_id: str, confirm: bool = False) -> dict:
    """
    Check cancellation eligibility and optionally cancel an order.

    confirm=False:
        Only checks whether the order can be cancelled.

    confirm=True:
        Cancels the order if its status is Processing.
    """

    if not order_id:
        return {
            "success": False,
            "message": "Order ID was not provided."
        }

    order_id = str(order_id).upper().strip()

    # Normalize order ID

    if order_id.startswith("OD"):
        order_id = "ORD" + order_id[2:]

    if order_id.startswith("ORDER"):
        remaining = order_id[5:].strip()

        if remaining.startswith("-"):
            order_id = "ORD" + remaining
        else:
            order_id = "ORD-" + remaining

    if order_id.isdigit():
        order_id = "ORD-" + order_id

    if order_id.startswith("ORD") and not order_id.startswith("ORD-"):
        number = order_id[3:].strip()

        if number.isdigit():
            order_id = "ORD-" + number

    print(
        "TOOL: Cancellation request:",
        order_id,
        "confirm=",
        confirm
    )

    # -----------------------------------------------------
    # ORDER NOT FOUND
    # -----------------------------------------------------

    if order_id not in ORDERS:

        print("TOOL: Cannot cancel - order not found")

        return {
            "success": False,
            "eligible": False,
            "message": f"No order was found with order ID {order_id}."
        }

    order = ORDERS[order_id]

    status = order.get("status", "")

    # -----------------------------------------------------
    # ALREADY CANCELLED
    # -----------------------------------------------------

    if status.lower() == "cancelled":

        return {
            "success": False,
            "eligible": False,
            "message": f"Order {order_id} has already been cancelled."
        }

    # -----------------------------------------------------
    # PROCESSING
    # -----------------------------------------------------

    if status.lower() == "processing":

        # Customer only asked whether cancellation is possible
        if not confirm:

            print(
                "TOOL: Order is eligible for cancellation:",
                order_id
            )

            return {
                "success": False,
                "eligible": True,
                "message": (
                    f"Order {order_id} is currently Processing "
                    "and is eligible for cancellation. "
                    "Ask the customer for confirmation before cancelling."
                )
            }

        # Customer explicitly confirmed cancellation
        order["status"] = "Cancelled"
        order["notes"] = "Order cancelled successfully by customer request."

        print(
            "TOOL: Order cancelled successfully:",
            order_id
        )

        return {
            "success": True,
            "eligible": True,
            "order_id": order_id,
            "status": "Cancelled",
            "message": f"Order {order_id} has been cancelled successfully."
        }

    # -----------------------------------------------------
    # SHIPPED
    # -----------------------------------------------------

    if status.lower() == "shipped":

        return {
            "success": False,
            "eligible": False,
            "message": (
                f"Order {order_id} has already been shipped "
                "and cannot be cancelled."
            )
        }

    # -----------------------------------------------------
    # OUT FOR DELIVERY
    # -----------------------------------------------------

    if status.lower() == "out for delivery":

        return {
            "success": False,
            "eligible": False,
            "message": (
                f"Order {order_id} is already out for delivery "
                "and cannot be cancelled. "
                "The customer may refuse the package at the doorstep."
            )
        }

    # -----------------------------------------------------
    # DELIVERED
    # -----------------------------------------------------

    if status.lower() == "delivered":

        return {
            "success": False,
            "eligible": False,
            "message": (
                f"Order {order_id} has already been delivered "
                "and cannot be cancelled."
            )
        }

    # -----------------------------------------------------
    # OTHER STATUS
    # -----------------------------------------------------

    return {
        "success": False,
        "eligible": False,
        "message": (
            f"Order {order_id} cannot be cancelled because "
            f"its current status is {status}."
        )
    }


# =========================================================
# AURA SYSTEM PROMPT
# =========================================================

SYSTEM_PROMPT = """

You are Aria, the AI customer support specialist for Aura Skincare.

You are speaking to customers through a voice interface.

PERSONALITY:

- Friendly
- Professional
- Concise
- Helpful
- Natural Indian English
- Speak naturally
- Do not repeat yourself unnecessarily
- Keep responses short because your responses are spoken aloud


=========================================================
AURA SKINCARE POLICIES
=========================================================

DELIVERY:

- Free delivery for orders above ₹499.
- Orders ₹499 or below have a ₹50 delivery charge.
- Standard delivery takes 3–5 business days.


RETURNS:

- Returns are allowed within 7 days of delivery.
- Product must be unopened and unused.
- Original packaging must be intact.


DAMAGED OR DEFECTIVE PRODUCTS:

- Customer must report the issue within 48 hours.
- Photos may be required.
- Damaged products may be eligible for replacement.


CANCELLATION:

- Orders can be cancelled only while the order is Processing.
- Shipped orders cannot be cancelled.
- Out for Delivery orders cannot be cancelled.
- Delivered orders cannot be cancelled.
- Customers may refuse an Out for Delivery package at the doorstep.


COD:

- Cash or UPI is supported.
- COD is available up to ₹2,500.


=========================================================
ORDER LOOKUP
=========================================================

When a customer asks about:

- Order status
- Delivery
- Tracking
- Cancellation
- Order details
- Whether an order can be cancelled

use the get_order_details tool whenever an order ID is available.

NEVER invent order information.

If the order ID is missing or unclear, ask the customer for it.

If the customer says:

"order 101"
"ORD 101"
"OD 101"
"order number 101"

interpret it as:

ORD-101

If the customer says:

"order 103"
"ORD 103"
"OD 103"
"order number 103"

interpret it as:

ORD-103.


=========================================================
CANCELLATION TOOL
=========================================================

You have access to a cancel_order tool.

IMPORTANT:

If the customer asks:

"Can I cancel order 103?"
"Is order 103 eligible for cancellation?"
"Can I cancel it?"

first use cancel_order with confirm=false.

If the order is Processing, tell the customer that it is eligible for cancellation.

Then ask for confirmation if appropriate.

If the customer explicitly says:

"Yes, cancel it."
"Please cancel it."
"Cancel my order."
"Go ahead and cancel it."

and you know the correct order ID, use:

cancel_order(order_id, confirm=true)

Only claim that an order was cancelled if the cancellation tool returns success=true.

NEVER claim that an order was cancelled if the tool did not successfully cancel it.

For orders that are Shipped or Out for Delivery:

- Do not attempt cancellation.
- Explain that cancellation is not possible.
- For Out for Delivery orders, explain that the customer can refuse the package at the doorstep.

For Delivered orders:

- Do not treat cancellation as possible.


=========================================================
RETURN RULES
=========================================================

Returns are allowed only within 7 days of delivery.

The product must be unopened and unused and in original packaging.

If a customer says:

"I received my order 20 days ago and want to return it."

Do NOT agree.

Explain that the 7-day return window has passed.


=========================================================
OUT OF SCOPE
=========================================================

You only support:

- Aura Skincare products
- Aura Skincare orders
- Delivery
- Tracking
- Returns
- Refund-related support
- Cancellation
- COD
- Product-related customer support

If someone asks about an unrelated topic such as:

"Book me a flight to Goa"

politely say that you can only assist with Aura Skincare customer support.


=========================================================
UNCLEAR SPEECH
=========================================================

If the customer's speech is unclear, politely ask them to repeat.

Do not guess important information.


=========================================================
IMPORTANT
=========================================================

Do not simply agree with the customer.

Always follow Aura Skincare's policies.

Never invent order information.

Use the order lookup tool for order-specific information.

Never claim that an action was completed unless the relevant tool confirms success.

Keep spoken responses concise.
"""


# =========================================================
# CREATE GEMINI CHAT
# =========================================================

def create_chat(model_name):

    return client.chats.create(
        model=model_name,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            tools=[
                get_order_details,
                cancel_order
            ]
        )
    )


# =========================================================
# PRIMARY CHAT
# =========================================================

chat = create_chat(PRIMARY_MODEL)


# =========================================================
# HOME PAGE
# =========================================================

@app.route("/")
def home():
    return render_template("index.html")


# =========================================================
# ORDER API
# =========================================================

@app.route("/api/order/<order_id>")
def order_api(order_id):

    result = get_order_details(order_id)

    return jsonify(result)


# =========================================================
# CHAT API
# =========================================================

@app.route("/api/chat", methods=["POST"])
def chat_api():

    global chat

    try:

        data = request.get_json(silent=True) or {}

        print("\n========================================")
        print("RAW REQUEST DATA:", data)

        user_message = (
            data.get("message")
            or data.get("text")
            or data.get("transcript")
            or data.get("user_message")
            or ""
        ).strip()

        print("USER MESSAGE:", user_message)

        if not user_message:

            return jsonify({
                "reply": (
                    "I couldn't understand the message. "
                    "Could you please repeat that?"
                )
            })

        # =================================================
        # TRY PRIMARY MODEL
        # =================================================

        try:

            print("GEMINI MODEL:", PRIMARY_MODEL)

            response = chat.send_message(user_message)

            reply = response.text.strip()

            print("ARIA:", reply)
            print("========================================\n")

            return jsonify({
                "reply": reply
            })

        except Exception as primary_error:

            print(
                "PRIMARY MODEL ERROR:",
                repr(primary_error)
            )

            # =============================================
            # FALLBACK MODEL
            # =============================================

            print(
                "Trying fallback model:",
                FALLBACK_MODEL
            )

            fallback_chat = create_chat(
                FALLBACK_MODEL
            )

            fallback_response = fallback_chat.send_message(
                user_message
            )

            reply = fallback_response.text.strip()

            print(
                "ARIA FALLBACK:",
                reply
            )

            print(
                "========================================\n"
            )

            return jsonify({
                "reply": reply
            })

    except Exception as e:

        print(
            "\nGEMINI ERROR:",
            repr(e)
        )

        print(
            "========================================\n"
        )

        return jsonify({
            "reply": (
                "I'm sorry, I'm having trouble processing "
                "your request right now. Please try again."
            )
        }), 500


# =========================================================
# RUN FLASK
# =========================================================

if __name__ == "__main__":
    import os

    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )