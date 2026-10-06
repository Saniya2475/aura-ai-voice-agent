// ============================================================
// AURA SKINCARE - AI VOICE AGENT
// ============================================================

// ============================================================
// GLOBAL VARIABLES
// ============================================================

let isCallActive = false;
let conversation = [];
let chatHistory = [];
let selectedOrderId = null;
let recognition = null;
let isProcessingResponse = false;


// ============================================================
// GET BUTTONS
// ============================================================

function getStartButton() {
    return document.getElementById("startCallBtn");
}

function getEndButton() {
    return document.getElementById("endCallBtn");
}


// ============================================================
// UPDATE CALL BUTTONS
// ============================================================

function updateCallButtons() {

    const startButton = getStartButton();
    const endButton = getEndButton();

    if (startButton) {
        startButton.disabled = isCallActive;
    }

    if (endButton) {
        endButton.disabled = !isCallActive;
    }
}


// ============================================================
// START CALL
// ============================================================

function startCall() {

    if (isCallActive) {
        return;
    }

    isCallActive = true;
    isProcessingResponse = false;

    conversation = [];
    chatHistory = [];
    selectedOrderId = null;

    clearTranscript();

    const summarySection =
        document.getElementById("summarySection");

    if (summarySection) {
        summarySection.style.display = "none";
        summarySection.classList.add("hidden");
    }

    updateCallButtons();

    setState(
        "listening",
        "🎙️",
        "Starting Call",
        "Aria is getting ready..."
    );

    const greeting =
        "Hello! I'm Aria from Aura Skincare. How can I help you today?";

    addTranscriptMessage(
        "Aria",
        greeting
    );

    speak(
        greeting,
        startListening
    );
}


// ============================================================
// END CALL
// ============================================================

function endCall() {

    if (!isCallActive) {
        return;
    }

    isCallActive = false;
    isProcessingResponse = false;

    if (recognition) {

        try {
            recognition.stop();
        } catch (error) {
            console.log(
                "Recognition already stopped."
            );
        }
    }

    if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
    }

    updateCallButtons();

    setState(
        "idle",
        "📞",
        "Call Ended",
        "Your conversation has ended."
    );

    generateSummary();
}


// ============================================================
// SPEECH RECOGNITION SETUP
// ============================================================

function setupSpeechRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        alert(
            "Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge."
        );

        return false;
    }

    recognition =
        new SpeechRecognition();

    recognition.lang = "en-IN";

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.maxAlternatives = 1;


    // --------------------------------------------------------
    // SPEECH RESULT
    // --------------------------------------------------------

    recognition.onresult =
        function(event) {

            if (!isCallActive) {
                return;
            }

            const transcript =
                event.results[0][0]
                    .transcript
                    .trim();

            if (!transcript) {
                return;
            }

            console.log(
                "User said:",
                transcript
            );

            detectOrderId(transcript);

            addTranscriptMessage(
                "You",
                transcript
            );

            chatHistory.push({
                role: "user",
                content: transcript
            });

            isProcessingResponse = true;

            setState(
                "thinking",
                "🧠",
                "Thinking...",
                "Aria is processing your request."
            );

            sendMessageToAI(transcript);
        };


    // --------------------------------------------------------
    // SPEECH ERROR
    // --------------------------------------------------------

    recognition.onerror =
        function(event) {

            console.log(
                "Speech recognition error:",
                event.error
            );

            if (!isCallActive) {
                return;
            }

            if (
                event.error === "no-speech" ||
                event.error === "audio-capture"
            ) {

                setState(
                    "listening",
                    "🎙️",
                    "Listening...",
                    "I didn't catch that. Please speak again."
                );

                setTimeout(
                    startListening,
                    500
                );
            }
        };


    // --------------------------------------------------------
    // SPEECH END
    // --------------------------------------------------------

    recognition.onend =
        function() {

            if (
                isCallActive &&
                !isProcessingResponse
            ) {

                startListening();
            }
        };

    return true;
}


// ============================================================
// START LISTENING
// ============================================================

function startListening() {

    if (!isCallActive) {
        return;
    }

    if (!recognition) {

        const ready =
            setupSpeechRecognition();

        if (!ready) {
            return;
        }
    }

    if (isProcessingResponse) {
        return;
    }

    setState(
        "listening",
        "🎙️",
        "Listening...",
        "Speak naturally to Aria."
    );

    try {

        recognition.start();

    } catch (error) {

        console.log(
            "Recognition start issue:",
            error
        );
    }
}


// ============================================================
// SEND MESSAGE TO AI
// ============================================================

async function sendMessageToAI(
    userMessage
) {

    try {

        const response =
            await fetch(
                "/api/chat",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        message: userMessage
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.reply ||
                "Server error"
            );
        }


        const reply =
            data.reply ||
            "I'm sorry, I couldn't process that request.";


        chatHistory.push({
            role: "assistant",
            content: reply
        });


        isProcessingResponse = false;


        addTranscriptMessage(
            "Aria",
            reply
        );


        // ----------------------------------------------------
        // REFRESH ORDER CARD
        // ----------------------------------------------------

        if (selectedOrderId) {

            refreshOrderCard(
                selectedOrderId
            );
        }


        speak(
            reply,
            function() {

                if (isCallActive) {
                    startListening();
                }

            }
        );


    } catch (error) {

        console.error(
            "AI request error:",
            error
        );


        isProcessingResponse = false;


        const errorMessage =
            "I'm sorry, I'm having trouble processing your request right now. Please try again.";


        addTranscriptMessage(
            "Aria",
            errorMessage
        );


        speak(
            errorMessage,
            function() {

                if (isCallActive) {
                    startListening();
                }

            }
        );
    }
}


// ============================================================
// TEXT TO SPEECH
// ============================================================

function speak(
    text,
    callback = null
) {

    if (!("speechSynthesis" in window)) {

        if (callback) {
            callback();
        }

        return;
    }


    speechSynthesis.cancel();


    const utterance =
        new SpeechSynthesisUtterance(
            text
        );


    utterance.lang = "en-IN";

    utterance.rate = 0.95;

    utterance.pitch = 1.0;

    utterance.volume = 1.0;


    const voices =
        speechSynthesis.getVoices();


    const indianVoice =
        voices.find(
            voice =>
                voice.lang &&
                voice.lang
                    .toLowerCase()
                    .includes("en-in")
        );


    const englishVoice =
        voices.find(
            voice =>
                voice.lang &&
                voice.lang
                    .toLowerCase()
                    .startsWith("en")
        );


    if (indianVoice) {

        utterance.voice =
            indianVoice;

    } else if (englishVoice) {

        utterance.voice =
            englishVoice;
    }


    utterance.onstart =
        function() {

            setState(
                "speaking",
                "🔊",
                "Aria is Speaking",
                "Please listen..."
            );
        };


    utterance.onend =
        function() {

            if (
                callback &&
                isCallActive
            ) {

                callback();
            }
        };


    speechSynthesis.speak(
        utterance
    );
}


// ============================================================
// STATE DISPLAY
// ============================================================

function setState(
    state,
    icon,
    title,
    description
) {

    const stateIcon =
        document.getElementById(
            "stateIcon"
        );

    const stateTitle =
        document.getElementById(
            "stateTitle"
        );

    const stateDescription =
        document.getElementById(
            "stateDescription"
        );


    if (stateIcon) {
        stateIcon.textContent =
            icon;
    }


    if (stateTitle) {
        stateTitle.textContent =
            title;
    }


    if (stateDescription) {
        stateDescription.textContent =
            description;
    }
}


// ============================================================
// TRANSCRIPT
// ============================================================

function addTranscriptMessage(
    speaker,
    text
) {

    conversation.push({
        speaker: speaker,
        text: text
    });


    const transcript =
        document.getElementById(
            "transcript"
        );


    if (!transcript) {
        return;
    }


    const emptyMessage =
        transcript.querySelector(
            ".empty-transcript"
        );


    if (emptyMessage) {
        emptyMessage.remove();
    }


    const message =
        document.createElement(
            "div"
        );


    message.className =
        "transcript-message";


    const speakerElement =
        document.createElement(
            "strong"
        );


    speakerElement.textContent =
        speaker + ":";


    const textElement =
        document.createElement(
            "span"
        );


    textElement.textContent =
        " " + text;


    message.appendChild(
        speakerElement
    );


    message.appendChild(
        textElement
    );


    transcript.appendChild(
        message
    );


    transcript.scrollTop =
        transcript.scrollHeight;
}


// ============================================================
// CLEAR TRANSCRIPT
// ============================================================

function clearTranscript() {

    const transcript =
        document.getElementById(
            "transcript"
        );


    if (transcript) {

        transcript.innerHTML = `
            <div class="empty-transcript">
                <div>💬</div>
                <p>Your conversation will appear here.</p>
            </div>
        `;
    }
}


// ============================================================
// DETECT ORDER ID
// ============================================================

function detectOrderId(
    text
) {

    if (!text) {
        return null;
    }


    const originalText =
        text.toUpperCase();


    // ORD-101 / ORD 101
    let match =
        originalText.match(
            /\bORD[-\s]?(\d{3})\b/
        );


    if (match) {

        selectedOrderId =
            "ORD-" + match[1];

        console.log(
            "Detected order:",
            selectedOrderId
        );

        return selectedOrderId;
    }


    // OD 101
    match =
        originalText.match(
            /\bOD[-\s]?(\d{3})\b/
        );


    if (match) {

        selectedOrderId =
            "ORD-" + match[1];

        console.log(
            "Detected order:",
            selectedOrderId
        );

        return selectedOrderId;
    }


    // ORDER 101
    match =
        originalText.match(
            /\bORDER(?:\s+NUMBER)?[-\s]?(\d{3})\b/
        );


    if (match) {

        selectedOrderId =
            "ORD-" + match[1];

        console.log(
            "Detected order:",
            selectedOrderId
        );

        return selectedOrderId;
    }


    // FOR THE 101
    match =
        originalText.match(
            /\bFOR\s+(?:THE\s+)?(\d{3})\b/
        );


    if (match) {

        selectedOrderId =
            "ORD-" + match[1];

        console.log(
            "Detected order:",
            selectedOrderId
        );

        return selectedOrderId;
    }


    // THE 101
    match =
        originalText.match(
            /\bTHE\s+(\d{3})\b/
        );


    if (match) {

        selectedOrderId =
            "ORD-" + match[1];

        console.log(
            "Detected order:",
            selectedOrderId
        );

        return selectedOrderId;
    }


    // Any three digit number with order-related words
    match =
        originalText.match(
            /\b(\d{3})\b/
        );


    if (match) {

        const number =
            match[1];

        const orderWords = [
            "ORDER",
            "DELIVERY",
            "DELIVER",
            "TRACK",
            "TRACKING",
            "CANCEL",
            "CANCELLATION",
            "RETURN",
            "REFUND"
        ];


        const looksLikeOrder =
            orderWords.some(
                word =>
                    originalText.includes(
                        word
                    )
            );


        if (looksLikeOrder) {

            selectedOrderId =
                "ORD-" + number;

            console.log(
                "Detected order:",
                selectedOrderId
            );

            return selectedOrderId;
        }
    }


    // Keep previous order ID for "it"
    return selectedOrderId;
}


// ============================================================
// REFRESH ORDER CARD
// ============================================================

async function refreshOrderCard(
    orderId
) {

    if (!orderId) {
        return;
    }


    try {

        const response =
            await fetch(
                `/api/order/${orderId}`
            );


        const data =
            await response.json();


        if (!data.found) {
            return;
        }


        const order =
            data.order;


        const orderCards =
            document.querySelectorAll(
                ".order-card"
            );


        orderCards.forEach(
            function(card) {

                const orderIdElement =
                    card.querySelector(
                        ".order-top strong"
                    );


                if (!orderIdElement) {
                    return;
                }


                if (
                    orderIdElement.textContent
                        .trim()
                        .toUpperCase() !==
                    order.order_id.toUpperCase()
                ) {

                    return;
                }


                // ------------------------------------------
                // UPDATE STATUS
                // ------------------------------------------

                const statusElement =
                    card.querySelector(
                        ".status"
                    );


                if (statusElement) {

                    statusElement.textContent =
                        order.status;


                    statusElement.classList.remove(
                        "delivery",
                        "delivered",
                        "processing",
                        "cancelled"
                    );


                    if (
                        order.status
                            .toLowerCase() ===
                        "out for delivery"
                    ) {

                        statusElement.classList.add(
                            "delivery"
                        );

                    } else if (
                        order.status
                            .toLowerCase() ===
                        "delivered"
                    ) {

                        statusElement.classList.add(
                            "delivered"
                        );

                    } else if (
                        order.status
                            .toLowerCase() ===
                        "processing"
                    ) {

                        statusElement.classList.add(
                            "processing"
                        );

                    } else if (
                        order.status
                            .toLowerCase() ===
                        "cancelled"
                    ) {

                        statusElement.classList.add(
                            "cancelled"
                        );
                    }
                }


                // ------------------------------------------
                // UPDATE ORDER DETAILS
                // ------------------------------------------

                const details =
                    card.querySelector(
                        ".order-details"
                    );


                if (details) {

                    const spans =
                        details.querySelectorAll(
                            "span"
                        );


                    if (
                        order.status
                            .toLowerCase() ===
                        "cancelled"
                    ) {

                        if (spans.length >= 2) {

                            spans[1].textContent =
                                "Cancelled";
                        }
                    }
                }


                // ------------------------------------------
                // VISUAL UPDATE
                // ------------------------------------------

                if (
                    order.status
                        .toLowerCase() ===
                    "cancelled"
                ) {

                    card.style.opacity =
                        "0.75";
                }
            }
        );


    } catch (error) {

        console.error(
            "Could not refresh order card:",
            error
        );
    }
}


// ============================================================
// ORDER CARD TEST
// ============================================================

async function useOrderId(
    orderId
) {

    selectedOrderId =
        orderId;


    addTranscriptMessage(
        "You",
        "I want to check order " +
        orderId
    );


    try {

        const response =
            await fetch(
                `/api/order/${orderId}`
            );


        const data =
            await response.json();


        let message;


        if (data.found) {

            message =
                `Order ${data.order.order_id} is ${data.order.status}. ` +
                `${data.order.product}. ` +
                `${data.order.notes}`;

        } else {

            message =
                data.message ||
                "I couldn't find that order.";
        }


        addTranscriptMessage(
            "Aria",
            message
        );


        speak(message);


        // Refresh card
        refreshOrderCard(orderId);


    } catch (error) {

        console.error(error);


        const message =
            "I'm sorry, I couldn't retrieve that order right now.";


        addTranscriptMessage(
            "Aria",
            message
        );


        speak(message);
    }
}


// ============================================================
// DETERMINE CUSTOMER INTENT
// ============================================================

function determineCustomerIntent() {

    const userMessages =
        conversation
            .filter(
                item =>
                    item.speaker === "You"
            )
            .map(
                item =>
                    item.text.toLowerCase()
            );


    const combinedText =
        userMessages.join(" ");


    // OUT OF SCOPE
    const outOfScopeWords = [
        "flight",
        "book a flight",
        "hotel",
        "movie ticket",
        "train ticket",
        "taxi",
        "cab",
        "restaurant reservation",
        "weather",
        "cricket",
        "football"
    ];


    if (
        outOfScopeWords.some(
            word =>
                combinedText.includes(
                    word
                )
        )
    ) {

        return "OUT_OF_SCOPE";
    }


    // CANCELLATION
    if (
        combinedText.includes("cancel") ||
        combinedText.includes("cancellation")
    ) {

        return "ORDER_CANCELLATION";
    }


    // RETURN / REFUND
    if (
        combinedText.includes("return") ||
        combinedText.includes("refund")
    ) {

        return "RETURN_REFUND";
    }


    // DAMAGED PRODUCT
    if (
        combinedText.includes("damaged") ||
        combinedText.includes("damage") ||
        combinedText.includes("defective") ||
        combinedText.includes("broken")
    ) {

        return "DAMAGED_PRODUCT";
    }


    // ORDER TRACKING
    if (
        combinedText.includes("where is my order") ||
        combinedText.includes("order status") ||
        combinedText.includes("track my order") ||
        combinedText.includes("tracking") ||
        combinedText.includes("delivery") ||
        selectedOrderId
    ) {

        return "ORDER_TRACKING";
    }


    // DELIVERY SUPPORT
    if (
        combinedText.includes("shipping") ||
        combinedText.includes("delivery charge") ||
        combinedText.includes("deliver")
    ) {

        return "DELIVERY_SUPPORT";
    }


    // COD
    if (
        combinedText.includes("cash on delivery") ||
        combinedText.includes("cod") ||
        combinedText.includes("cash")
    ) {

        return "COD_SUPPORT";
    }


    return "GENERAL_SUPPORT";
}


// ============================================================
// DETERMINE RESOLUTION STATUS
// ============================================================

function determineResolutionStatus(
    intent
) {

    if (
        intent === "OUT_OF_SCOPE"
    ) {

        return "OUT_OF_SCOPE";
    }


    const hasProcessingError =
        conversation.some(
            item =>
                item.speaker === "Aria" &&
                item.text
                    .toLowerCase()
                    .includes(
                        "trouble processing"
                    )
        );


    if (hasProcessingError) {
        return "UNRESOLVED";
    }


    return "RESOLVED";
}


// ============================================================
// GENERATE CALL SUMMARY
// ============================================================

function generateSummary() {

    const summarySection =
        document.getElementById(
            "summarySection"
        );


    const summaryOutput =
        document.getElementById(
            "summaryOutput"
        );


    if (
        !summarySection ||
        !summaryOutput
    ) {

        return;
    }


    const customerIntent =
        determineCustomerIntent();


    const resolutionStatus =
        determineResolutionStatus(
            customerIntent
        );


    let callSummary =
        "Customer contacted Aura Skincare support.";


    // ORDER TRACKING
    if (
        customerIntent ===
        "ORDER_TRACKING"
    ) {

        if (selectedOrderId) {

            callSummary =
                `Customer asked about the delivery or status of ${selectedOrderId}.`;

        } else {

            callSummary =
                "Customer asked about an Aura Skincare order or delivery.";
        }
    }


    // CANCELLATION
    else if (
        customerIntent ===
        "ORDER_CANCELLATION"
    ) {

        if (selectedOrderId) {

            callSummary =
                `Customer asked about cancelling ${selectedOrderId}.`;

        } else {

            callSummary =
                "Customer contacted Aura Skincare support regarding order cancellation.";
        }
    }


    // RETURN
    else if (
        customerIntent ===
        "RETURN_REFUND"
    ) {

        if (selectedOrderId) {

            callSummary =
                `Customer asked about a return or refund for ${selectedOrderId}.`;

        } else {

            callSummary =
                "Customer asked about Aura Skincare's return or refund policy.";
        }
    }


    // DAMAGED PRODUCT
    else if (
        customerIntent ===
        "DAMAGED_PRODUCT"
    ) {

        callSummary =
            "Customer contacted Aura Skincare support regarding a damaged or defective product.";
    }


    // DELIVERY
    else if (
        customerIntent ===
        "DELIVERY_SUPPORT"
    ) {

        callSummary =
            "Customer asked about Aura Skincare delivery or shipping.";
    }


    // COD
    else if (
        customerIntent ===
        "COD_SUPPORT"
    ) {

        callSummary =
            "Customer asked about Cash on Delivery availability or limits.";
    }


    // OUT OF SCOPE
    else if (
        customerIntent ===
        "OUT_OF_SCOPE"
    ) {

        callSummary =
            "Customer asked for assistance outside Aura Skincare's supported services.";
    }


    const summary = {

        customer_intent:
            customerIntent,

        order_id:
            selectedOrderId,

        resolution_status:
            resolutionStatus,

        call_summary:
            callSummary,

        transcript:
            conversation
    };


    summaryOutput.textContent =
        JSON.stringify(
            summary,
            null,
            2
        );


    summarySection.style.display =
        "block";


    summarySection.classList.remove(
        "hidden"
    );
}


// ============================================================
// LOAD SPEECH VOICES
// ============================================================

if ("speechSynthesis" in window) {

    speechSynthesis.onvoiceschanged =
        function() {

            speechSynthesis.getVoices();

        };
}


// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        updateCallButtons();

        setState(
            "idle",
            "🎙️",
            "Ready to help",
            "Click Start Call to begin"
        );

    }
);