# updated website

This repo is built on a fork of **Jekyll Now** from [this repository](https://github.com/barryclark/jekyll-now). **Jekyll** is a static site generator that's perfect for GitHub hosted blogs ([Jekyll Repository](https://github.com/jekyll/jekyll))

The website design is just a modification of [Jon Barron's website](https://jonbarron.info/) and is converted for my own use, re-purposing my old markdown posts. **Feel free to use template for your own purposes**, but please respect copyright for all the images/content in my `images`, `pdfs`, `_posts` folders. 



## issues
* In general, jekyll will try to build a full page for every post. I skip that by forcing `permalink: /`. This creates multiple entries in sitemap.xml for index.html but is otherwise fine. 
* If you want multiple paragraphs, consider using `excerpt_separator: <!--more-->` in `_config.yml`, for my own use I didn't need this. 
* My own posts have lots of extra stuff left over from my old jekyll design ("author", long descriptions, etc.), feel free to ignore them
* I use thumbnails, so I can upload arbitrary sized images but then only display small ones. The `_make_thumbnails.sh` script generates them and the html template looks in `tn/` for all images. 
* I have three categories of post with slightly differerent formatting, so changing sizing requires edits in multiple paces. 
* If you use this, I'd appreciate a link back either to this repo or my personal website so others can find this too. 

## Tests

Playwright end-to-end tests cover the reading page behaviors (language switching, timeline, keyboard shortcuts) and the mobile homepage layout checks.

### Test setup

1. Install Ruby deps (for the site server): `bundle install`
2. Install JS deps: `npm install`
3. Download Playwright browsers (needed once): `npx playwright install chromium chromium-headless-shell`

### Run

1. Start the site in one terminal (port 4000, no baseurl):  
   `bundle exec jekyll serve --port 4000 --livereload --baseurl ''`
2. In another terminal, run the Playwright suite against that server:  
   `BASE_URL=http://localhost:4000 npm test`

You can run headed or UI mode with `npm run test:headed` or `npm run test:ui`.

CI: GitHub Actions (`.github/workflows/ci.yml`) builds the site, serves `_site` on port 4000, installs Playwright browsers, and runs the Playwright suite on every push/PR.

## Writing comments (Disqus)

`writing/the-real-flywheel/index.html` now includes a reusable comments block via:

```liquid
{% include writing-comments.html %}
```

To use comments on future writing pages, add the same include near the end of the article content.

Configuration lives in `_config.yml`:

```yml
comments:
  provider: disqus
  disqus_shortname: "<your-disqus-shortname>"
```

Set `comments.disqus_shortname` to the exact Disqus **forum shortname** from
`https://disqus.com/admin/settings/general/` (not your username or domain).

You can disable comments per page with front matter: `comments: false`.

## Local development

On macOS, the system Ruby can be too old for the repo's locked bundler and may cause gem install issues.

Recommended setup:

- Install Ruby 3.2: `brew install ruby@3.2`
- Run the dev server: `bash scripts/dev.sh`

Notes:
- We set `LANG/LC_ALL` to UTF-8 in scripts to avoid intermittent Sass/SCSS encoding errors.
- E2E tests can be run with: `npm run test:e2e` (auto-starts Jekyll).
