# Aura Skincare — AI Voice Customer Support Agent

An AI-powered browser-based voice customer support agent built for the DataStraw AI Voice Agent Assessment.

The agent, **Aria**, helps customers with Aura Skincare-related queries such as order tracking, cancellations, returns, refunds, delivery, COD, and damaged products.

---

## 🚀 Live Demo

**Application URL:**  
https://aura-ai-voice-agent-r2qh.onrender.com/
---

## 🎯 Project Overview

Aura Skincare is a fictional premium organic Indian skincare brand.

This project provides a browser-based AI voice customer support experience where a customer can:

- Start a voice conversation with Aria
- Ask questions naturally through the microphone
- Receive spoken responses
- Check order status
- Ask about cancellations
- Ask about returns and refunds
- Report damaged products
- Ask about delivery charges
- Ask about COD
- Receive policy-aware responses
- Handle invalid order IDs gracefully
- Ask out-of-scope questions
- View the complete call transcript
- View a structured post-call JSON summary

The goal was to create a simple but realistic customer-support experience rather than just a text chatbot.

---

# ✨ Features

## 🎙 Voice Conversation

Customers interact with Aria using their browser microphone.

The application supports:

- Browser-based speech recognition
- Natural conversational interaction
- Indian English speech recognition
- Text-to-speech responses
- Conversation context
- Automatic listening after each response

---

## 🤖 Aria — AI Support Specialist

Aria is designed as a:

> Friendly, professional and concise Aura Skincare customer support specialist.

Aria can assist with:

- Order tracking
- Order cancellation
- Returns
- Refund-related questions
- Damaged or defective products
- Delivery charges
- Delivery timelines
- Cash on Delivery
- Aura Skincare product/order support

Aria refuses requests outside the scope of Aura Skincare support.

---

# 📦 Mock Order Database

The application uses the mock orders provided in the DataStraw assignment.

### ORD-101

| Field | Details |
|---|---|
| Customer | Priya Sharma |
| Product | Vitamin C Serum (30ml) |
| Value | ₹699 |
| Status | Out for Delivery |
| Courier | BlueDart |
| Tracking | BD-982103 |
| Expected | 6 PM today |

### ORD-102

| Field | Details |
|---|---|
| Customer | Rahul Verma |
| Product | Hydrating Sunscreen SPF 50 |
| Value | ₹499 |
| Status | Delivered |
| Courier | Delhivery |
| Tracking | DL-441029 |
| Delivery | 14 days ago |

### ORD-103

| Field | Details |
|---|---|
| Customer | Ananya Patel |
| Product | Green Tea Face Wash + Toner |
| Value | ₹850 |
| Status | Processing |
| Ordered | 3 hours ago |
| Cancellation | Eligible |

---

# 📋 Aura Skincare Policies

The AI agent follows the policies supplied in the assessment.

### Shipping

- Orders above ₹499 → Free delivery
- Orders below ₹499 → ₹50 delivery charge
- Standard delivery → 3–5 business days

### Returns

- Returns accepted within 7 days of delivery
- Product must be unopened
- Product must be unused
- Original packaging required

### Damaged / Defective Products

- Report within 48 hours of delivery
- Photos should be provided
- Replacement can be requested

### Cancellation

- Orders can be cancelled only while status is `Processing`
- `Shipped` orders cannot be cancelled
- `Out for Delivery` orders cannot be cancelled
- Customers may refuse delivery at the doorstep

### Cash on Delivery

- COD available for orders up to ₹2,500
- Payment can be made using cash or UPI at the doorstep

---

# 🧠 Example Conversations

## Order Tracking

**Customer:**

> Where is my order ORD-101?

**Aria:**

> Your order ORD-101 is currently out for delivery via BlueDart and is expected to reach you by 6 PM today.

The agent retrieves the order using the order lookup tool.

---

## Order Cancellation

**Customer:**

> Can I cancel ORD-103?

Aria checks the order status.

Because ORD-103 is currently `Processing`, cancellation is allowed.

---

## Cancellation Not Allowed

**Customer:**

> Can I cancel ORD-101?

Aria checks the order status.

Because ORD-101 is `Out for Delivery`, cancellation is not allowed.

Aria explains that the customer can refuse the package at the doorstep.

---

## Return Policy

**Customer:**

> I bought my product 20 days ago. Can I return it?

Aria does not simply agree.

The return request is outside the 7-day return window, so Aria explains the policy clearly.

---

## Damaged Product

**Customer:**

> My order arrived damaged. What should I do?

Aria explains that damaged products should be reported within 48 hours with photographs for replacement assistance.

---

## Invalid Order

**Customer:**

> Where is my order ORD-999?

Aria explains that the order could not be located and asks the customer to verify the order ID.

---

## Out-of-Scope Request

**Customer:**

> Can you book a flight to Goa?

Aria politely explains that she can only assist with Aura Skincare products, orders and customer support.

---

# 🏗️ Architecture

The application follows a modular voice-agent architecture.

```text
                ┌──────────────────────┐
                │      Customer        │
                │      Microphone      │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │ Browser Speech       │
                │ Recognition          │
                │      STT             │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │      Flask API       │
                │      Backend         │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │       Gemini         │
                │   LLM Reasoning      │
                └──────────┬───────────┘
                           │
                  ┌────────┴─────────┐
                  │                  │
                  ▼                  ▼
        ┌─────────────────┐   ┌─────────────────┐
        │ Order Tools     │   │ Policy / Brand  │
        │                 │   │ Knowledge       │
        │ get_order_     │   │                 │
        │ details()      │   │ Aura Policies   │
        │                 │   │                 │
        │ cancel_order() │   │ Guardrails      │
        └────────┬────────┘   └─────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │ orders.json     │
        │ Mock Database   │
        └─────────────────┘
                 │
                 ▼
        ┌──────────────────────┐
        │ Gemini Response      │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Browser Text-to-     │
        │ Speech               │
        │        TTS           │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Customer hears Aria  │
        └──────────────────────┘
