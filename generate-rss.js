const axios = require('axios');
const cheerio = require('cheerio');
const RSS = require('rss');
const fs = require('fs');

async function generateRSSFeed() {
  try {
    console.log('Fetching WBTV news page...');
    
    // Fetch the WBTV news page
    const response = await axios.get('https://www.wbtv.com/news/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Create RSS feed
    const feed = new RSS({
      title: 'WBTV News Feed',
      description: 'Latest news from WBTV Charlotte',
      feed_url: 'https://rajkboddu.github.io/wbtv-rss-feed/feed.xml',
      site_url: 'https://www.wbtv.com/news/',
      language: 'en',
      ttl: 60,
      pubDate: new Date()
    });
    
    const articles = [];
    
    // Look for common article selectors (these may need adjustment based on actual HTML structure)
    const articleSelectors = [
      'article',
      '.story-item',
      '.article-item',
      '.news-item',
      '[class*="story"]',
      '[class*="article"]',
      'h2 a, h3 a, h4 a' // Headlines with links
    ];
    
    let foundArticles = false;
    
    // Try different selectors to find articles
    for (const selector of articleSelectors) {
      const elements = $(selector);
      
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        
        elements.each((index, element) => {
          if (articles.length >= 20) return false; // Limit to 20 articles
          
          const $el = $(element);
          let title = '';
          let link = '';
          let description = '';
          let pubDate = new Date();
          
          // Extract title
          if ($el.is('a')) {
            title = $el.text().trim();
            link = $el.attr('href');
          } else {
            const titleEl = $el.find('h1, h2, h3, h4, h5, h6, .headline, .title, a[href]').first();
            title = titleEl.text().trim();
            link = titleEl.attr('href') || $el.find('a').first().attr('href');
          }
          
          // Extract description
          const descEl = $el.find('p, .summary, .excerpt, .description').first();
          description = descEl.text().trim() || title;
          
          // Make sure link is absolute
          if (link && link.startsWith('/')) {
            link = 'https://www.wbtv.com' + link;
          }
          
          // Only add if we have a title and link
          if (title && link && title.length > 10) {
            articles.push({
              title: title,
              description: description,
              url: link,
              date: pubDate
            });
            foundArticles = true;
          }
        });
        
        if (foundArticles) break; // Stop if we found articles
      }
    }
    
    // If no articles found with selectors, try a more general approach
    if (!foundArticles) {
      console.log('No articles found with common selectors, trying general approach...');
      
      // Look for any links that might be articles
      $('a[href*="/news/"], a[href*="/story/"], a[href*="/article/"]').each((index, element) => {
        if (articles.length >= 20) return false;
        
        const $el = $(element);
        const title = $el.text().trim();
        const link = $el.attr('href');
        
        if (title && link && title.length > 10) {
          const fullLink = link.startsWith('/') ? 'https://www.wbtv.com' + link : link;
          
          articles.push({
            title: title,
            description: title,
            url: fullLink,
            date: new Date()
          });
        }
      });
    }
    
    console.log(`Found ${articles.length} articles`);
    
    // Add articles to RSS feed
    articles.forEach(article => {
      feed.item({
        title: article.title,
        description: article.description,
        url: article.url,
        date: article.date
      });
    });
    
    // If no articles found, add a placeholder
    if (articles.length === 0) {
      feed.item({
        title: 'No articles found',
        description: 'The scraper could not find any articles. The website structure may have changed.',
        url: 'https://www.wbtv.com/news/',
        date: new Date()
      });
    }
    
    // Generate RSS XML
    const xml = feed.xml();
    
    // Write to file
    fs.writeFileSync('feed.xml', xml);
    
    console.log('RSS feed generated successfully!');
    console.log(`Feed contains ${articles.length} articles`);
    
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    
    // Create error RSS feed
    const errorFeed = new RSS({
      title: 'WBTV News Feed - Error',
      description: 'Error occurred while generating feed',
      feed_url: 'https://yourusername.github.io/your-repo-name/feed.xml',
      site_url: 'https://www.wbtv.com/news/',
      language: 'en'
    });
    
    errorFeed.item({
      title: 'Error generating feed',
      description: `An error occurred: ${error.message}`,
      url: 'https://www.wbtv.com/news/',
      date: new Date()
    });
    
    fs.writeFileSync('feed.xml', errorFeed.xml());
    
    throw error;
  }
}

// Run the generator
generateRSSFeed();
