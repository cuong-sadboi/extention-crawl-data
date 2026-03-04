const VLIDecodeChar = {
  "0": "k", "1": "A", "2": "T", "3": "Y", "4": "B", "5": "P",
  "6": "Z", "7": "U", "8": "K", "9": "M",
  "A": "0", "T": "1", "Y": "2", "B": "3", "P": "4", "Z": "5",
  "U": "6", "K": "7", "M": "8", "a": "9",
  "q": "a", "w": "b", "e": "c", "r": "d", "t": "e", "y": "f",
  "u": "g", "i": "h", "o": "i", "p": "j", "s": "l", "d": "m",
  "f": "n", "g": "o", "h": "p", "j": "q", "k": "r", "l": "s",
  "z": "t", "x": "u", "c": "v", "v": "w", "b": "x", "n": "y",
  "m": "z", "R": "&", "N": "=", "G": "."
};

function decrypt(str) {
  return str.split("").map(function (t) {
    return typeof VLIDecodeChar[t] !== "undefined" ? VLIDecodeChar[t] : t;
  }).join("");
}

function addRequest(request) {
  const tableRow = document.createElement("tr");
  tableRow.innerHTML =
    "<td>" + request.method + "</td>" +
    "<td>" + request.status + "</td>" +
    "<td>" + request.type + "</td>" +
    '<td><a href="' + request.url.href + '" target="_blank">Go to</a></td>' +
    "<td>" + request.url.hostname + "</td>" +
    "<td>" + request.url.pathname + "</td>" +
    "<td>" + request.url.queryParse + "</td>" +
    "<td>" + request.time + "</td>";
  document.getElementById("request-list").appendChild(tableRow);
}

// Clear button
document.getElementById("clear-btn").addEventListener("click", function () {
  document.getElementById("request-list").innerHTML = "";
});

// Listen for network requests
chrome.devtools.network.onRequestFinished.addListener(function (request) {
  if (
    !request.request.url.includes("vlitag.com") &&
    !request.request.url.includes("pubpowerplatform.io") &&
    !request.request.url.includes("vliplatform.com")
  ) {
    return;
  }

  var pUrl = new URL(request.request.url);
  pUrl.queryParse = pUrl.search;
  if (pUrl.searchParams.get("e")) {
    pUrl.queryParse = decrypt(pUrl.searchParams.get("e"));
  }

  var requestData = {
    method: request.request.method,
    status: request.response.status,
    type: request.response.content.mimeType,
    time: request.time > 1000
      ? (request.time / 1000).toFixed(2) + "s"
      : request.time.toFixed(0) + "ms",
    url: pUrl
  };
  addRequest(requestData);
});
