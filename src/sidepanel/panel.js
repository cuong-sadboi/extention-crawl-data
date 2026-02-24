const port = chrome.runtime.connect({ name: "sidepanel" });
port.onMessage.addListener((data) => {
    const container = document.getElementById("data");
    if (!data) {
        container.innerHTML = "<p>No data</p>";
        return;
    }
    container.innerHTML = `
    <p><b>Root Domain:</b> ${data.rootdomain}</p>
    <p><b>Network:</b> ${data.network}</p>
    <p><b>Campaign ID:</b> ${data.campaign_id}</p>
    <p><b>Click ID:</b> ${data.click_id}</p>
    <p><b>Arb Campaign:</b> ${data.arb_campaign_id}</p>
    <p><b>Layout ID:</b> ${data.arbLayoutID}</p>
  `;
});
export {};
//# sourceMappingURL=panel.js.map