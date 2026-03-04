(function () {
  const linksIsRunned = [];
  const PROXY_ENDPOINT =
    "https://n8n.pocpoc.io/webhook/acc1a1ea-3098-4c6c-848c-a6b3de29f90c";

  function findGitHubLinks() {
    const links = document.querySelectorAll("a[href*='github.com']");
    const githubLinks = [];
    const regex = /^https:\/\/github\.com\/[^/]+\/[^/]+$/;

    links.forEach((link) => {
      let githubUrl = link.getAttribute("href");
      if (regex.test(githubUrl.replace(/\/+$/, ""))) {
        githubLinks.push(link);
      }
    });

    return githubLinks;
  }

  async function getStarsCount(repoUrl) {
    let foundItem = linksIsRunned.find((item) => item.url === repoUrl);
    if (foundItem) {
      return foundItem.stars;
    }

    const response = await fetch(buildProxyUrl(repoUrl));
    const text = await response.text();
    const match = text.match(
      /<span[^>]*\bclass="[^"]*\bjs-social-count[^"]*"[^>]*>([^<]+)<\/span>/
    );
    if (match && match[1]) {
      let stars = match[1];
      linksIsRunned.push({ url: repoUrl, stars: stars });
      return stars;
    }

    linksIsRunned.push({ url: repoUrl, stars: "N/A" });
    return "N/A";
  }

  function processGitHubLinks() {
    const githubLinks = findGitHubLinks();

    githubLinks.forEach(async (link) => {
      const repoUrl = link.href;
      const starsCount = await getStarsCount(repoUrl);

      const starElement = document.createElement("span");
      starElement.textContent = "Stars: " + starsCount;
      starElement.style.cssText =
        "margin-left: 5px; display: inline-block; padding: 1px 7px; background: #7cc07c; color: #1e1e1e; border-radius: 5px;";
      link.parentNode.insertBefore(starElement, link.nextSibling);
    });
  }

  function buildProxyUrl(url) {
    return PROXY_ENDPOINT + "?url=" + encodeURIComponent(url);
  }

  window.addEventListener("load", processGitHubLinks);
})();
