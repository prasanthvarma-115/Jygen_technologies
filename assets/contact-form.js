(() => {
  const form = document.getElementById("project-form");
  const status = document.getElementById("form-status");
  if (!form || !status) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const fields = new FormData(form);
    const firstName = String(fields.get("first_name") || "").trim();
    const lastName = String(fields.get("last_name") || "").trim();
    const submitButton = form.querySelector('button[type="submit"]');

    const payload = {
      name: `${firstName} ${lastName}`.trim(),
      email: String(fields.get("email") || "").trim(),
      company: String(fields.get("company") || "").trim(),
      service: String(fields.get("service") || "").trim(),
      message: String(fields.get("details") || "").trim(),
      status: "New",
    };

    status.textContent = "";
    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to send your inquiry right now.");

      status.style.color = "#22c55e";
      status.textContent = "MESSAGE RECEIVED ✓ We will reply to the email address you provided.";
      form.reset();
    } catch (error) {
      status.style.color = "#ef4444";
      status.textContent = error.message || "Unable to send your inquiry right now.";
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
})();
