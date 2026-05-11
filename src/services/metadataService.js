const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT =
  'Mozilla/5.0 (compatible; ReadLaterPro/1.0; +https://readlaterpro.local)';

const getMeta = ($, name) =>
  $(`meta[property="${name}"]`).attr('content') ||
  $(`meta[name="${name}"]`).attr('content') ||
  null;

const absolutizeUrl = (value, baseUrl) => {
  if (!value) return null;

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
};

const getSourceType = (url) => {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');

    if (hostname.includes('github.com')) return 'github';
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
    if (hostname.includes('reddit.com')) return 'reddit';
    if (hostname.includes('medium.com')) return 'medium';

    return 'web';
  } catch {
    return 'other';
  }
};

const buildSummary = ($) => {
  const description =
    getMeta($, 'og:description') ||
    getMeta($, 'twitter:description') ||
    getMeta($, 'description');

  if (description) return description.trim();

  const firstParagraph = $('p')
    .map((_, element) => $(element).text().trim())
    .get()
    .find((text) => text.length > 80);

  return firstParagraph || null;
};

const getEstimatedReadTime = ($) => {
  const text = $('article').text() || $('body').text();
  const words = text.trim().split(/\s+/).filter(Boolean).length;

  if (words < 150) return null;

  return Math.max(1, Math.ceil(words / 220));
};

const fetchMetadata = async (url) => {
  const response = await axios.get(url, {
    timeout: 12000,
    maxRedirects: 5,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  const $ = cheerio.load(response.data);
  const title =
    getMeta($, 'og:title') ||
    getMeta($, 'twitter:title') ||
    $('title').first().text() ||
    null;
  const imageUrl =
    getMeta($, 'og:image') ||
    getMeta($, 'twitter:image') ||
    $('link[rel="image_src"]').attr('href') ||
    null;
  const favicon =
    $('link[rel="icon"]').attr('href') ||
    $('link[rel="shortcut icon"]').attr('href') ||
    '/favicon.ico';
  const parsedUrl = new URL(url);

  return {
    title: title ? title.trim() : null,
    summary: buildSummary($),
    imageUrl: absolutizeUrl(imageUrl, url),
    favicon: absolutizeUrl(favicon, url),
    domain: parsedUrl.hostname.replace(/^www\./, ''),
    sourceType: getSourceType(url),
    estimatedReadTime: getEstimatedReadTime($),
  };
};

module.exports = {
  fetchMetadata,
  getSourceType,
};
