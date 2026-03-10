require('dotenv').config();

async function testFetch() {
    const OLLAMA_URL = process.env.OLLAMA_URL || "https://ollama.com/api/generate";
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";
    const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;

    console.log("Testing URL:", OLLAMA_URL);

    const headers = { "Content-Type": "application/json" };
    if (OLLAMA_API_KEY) {
        headers["Authorization"] = `Bearer ${OLLAMA_API_KEY}`;
    }

    try {
        const response = await fetch(OLLAMA_URL, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: "Hello",
                stream: false
            })
        });

        console.log("Status:", response.status, response.statusText);
        if (!response.ok) {
            const text = await response.text();
            console.error("Error body:", text);
        } else {
            const data = await response.json();
            console.log("Response:", data);
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

testFetch();
