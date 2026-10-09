const decode = (value) => Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=")), (character) => character.charCodeAt(0));
const form = document.getElementById("loginForm");
const input = document.getElementById("accessPassword");
const message = document.getElementById("loginMessage");
const button = document.getElementById("unlockButton");
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "正在安全解鎖…";
  button.disabled = true;
  try {
    const response = await fetch("site_data.enc.json", { cache: "no-store" });
    if (!response.ok) throw new Error("網站資料暫時未能讀取，請稍後再試。");
    const envelope = await response.json();
    const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(input.value), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: decode(envelope.salt), iterations: envelope.iterations, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(envelope.iv), tagLength: 128 }, key, decode(envelope.ciphertext));
    const data = JSON.parse(new TextDecoder().decode(plain));
    window.initializeLearningSite(data);
    document.getElementById("loginView").hidden = true;
    document.getElementById("appRoot").hidden = false;
    document.getElementById("top").scrollIntoView();
  } catch (error) {
    message.textContent = error.name === "OperationError" || error instanceof SyntaxError ? "密碼不正確，請再試一次。" : error.message;
    input.focus();
    input.select();
  } finally {
    button.disabled = false;
  }
});