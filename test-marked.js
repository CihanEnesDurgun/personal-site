const marked = require('marked');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const md = `Gelecek Güvencesi: Basit metin formatı sayesinde 50 yıl sonra bile okunabilir

![bilgisayar fotosu normal](../images/blog-content/img-7956-copy-jpg-2026-02-27-20-14.jpg)

`;
const sanitizedMd = md.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, (match, alt, src) => {
    if (/[^a-zA-Z0-9\/._\-:]/.test(src)) {
        const encodedSrc = encodeURI(decodeURI(src));
        return `![${alt}](${encodedSrc})`;
    }
    return match;
});

let rawHtml = marked.parse(sanitizedMd, {
    sanitize: false,
    gfm: true,
    breaks: true
});

console.log("rawHtml:", rawHtml);

let html = DOMPurify.sanitize(rawHtml);
console.log("DOMPurify:", html);
