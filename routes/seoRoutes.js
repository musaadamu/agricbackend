const express = require('express');
const router = express.Router();
const Journal = require('../models/Journal');

// Generate sitemap.xml
router.get('/sitemap.xml', async (req, res) => {
    try {
        const baseUrl = process.env.FRONTEND_URL || 'https://agricfrontend.vercel.app';
        
        // Get all published journals
        const journals = await Journal.find({ status: 'published' })
            .select('_id publishedDate')
            .sort({ publishedDate: -1 });

        // Static pages
        const staticPages = [
            { url: '', priority: '1.0', changefreq: 'weekly' },
            { url: '/journals', priority: '0.9', changefreq: 'daily' },
            { url: '/archive', priority: '0.8', changefreq: 'weekly' },
            { url: '/about', priority: '0.7', changefreq: 'monthly' },
            { url: '/contact', priority: '0.6', changefreq: 'monthly' },
            { url: '/guide', priority: '0.7', changefreq: 'monthly' },
            { url: '/editorial-board', priority: '0.6', changefreq: 'monthly' }
        ];

        // Build sitemap XML
        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

        // Add static pages
        staticPages.forEach(page => {
            sitemap += `
    <url>
        <loc>${baseUrl}${page.url}</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>${page.changefreq}</changefreq>
        <priority>${page.priority}</priority>
    </url>`;
        });

        // Add journal pages
        journals.forEach(journal => {
            const lastmod = journal.publishedDate ? 
                new Date(journal.publishedDate).toISOString().split('T')[0] : 
                new Date().toISOString().split('T')[0];
            
            sitemap += `
    <url>
        <loc>${baseUrl}/journals/${journal._id}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>`;
        });

        sitemap += `
</urlset>`;

        res.set('Content-Type', 'application/xml');
        res.send(sitemap);
    } catch (error) {
        console.error('Error generating sitemap:', error);
        res.status(500).json({ message: 'Error generating sitemap' });
    }
});

// Generate robots.txt
router.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.FRONTEND_URL || 'https://agricfrontend.vercel.app';
    
    const robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /dashboard/
Disallow: /login
Disallow: /register
Disallow: /forgotpassword
Disallow: /resetpassword/
Disallow: /updateprofile
Disallow: /submission
Disallow: /manage-journals
Disallow: /journals/uploads

# Sitemap
Sitemap: ${baseUrl}/api/seo/sitemap.xml

# Crawl-delay
Crawl-delay: 1`;

    res.set('Content-Type', 'text/plain');
    res.send(robots);
});

// Get meta data for a specific journal
router.get('/journal-meta/:id', async (req, res) => {
    try {
        const journal = await Journal.findById(req.params.id);
        
        if (!journal) {
            return res.status(404).json({ message: 'Journal not found' });
        }

        const baseUrl = process.env.FRONTEND_URL || 'https://agricfrontend.vercel.app';

        const metaData = {
            title: `${journal.title} - JOVOTE`,
            description: journal.abstract ?
                journal.abstract.substring(0, 155) + '...' :
                `Read "${journal.title}" published in the Journal of Vocational Teacher Education.`,
            keywords: journal.keywords ? 
                [...journal.keywords, 'NIJOBED', 'business education', 'entrepreneurship'].join(', ') :
                'business education, entrepreneurship, academic journal, research',
            author: journal.authors ? journal.authors.join(', ') : 'NIJOBED Authors',
            publishedDate: journal.publishedDate,
            url: `${baseUrl}/journals/${journal._id}`,
            image: `${baseUrl}/images/logo.JPG`,
            structuredData: {
                "@context": "https://schema.org",
                "@type": "ScholarlyArticle",
                "headline": journal.title,
                "description": journal.abstract,
                "author": journal.authors ? journal.authors.map(author => ({
                    "@type": "Person",
                    "name": author
                })) : [],
                "publisher": {
                    "@type": "Organization",
                    "name": "Nigerian Journal of Business and Entrepreneurship Education",
                    "logo": {
                        "@type": "ImageObject",
                        "url": `${baseUrl}/images/logo.JPG`
                    }
                },
                "datePublished": journal.publishedDate,
                "keywords": journal.keywords ? journal.keywords.join(', ') : '',
                "url": `${baseUrl}/journals/${journal._id}`,
                "isPartOf": {
                    "@type": "Periodical",
                    "name": "Nigerian Journal of Business and Entrepreneurship Education",
                    "issn": "XXXX-XXXX"
                }
            }
        };

        res.json(metaData);
    } catch (error) {
        console.error('Error getting journal meta data:', error);
        res.status(500).json({ message: 'Error getting journal meta data' });
    }
});

// Get all journals for sitemap generation (lightweight)
router.get('/journals-sitemap', async (req, res) => {
    try {
        const journals = await Journal.find({ status: 'published' })
            .select('_id publishedDate')
            .sort({ publishedDate: -1 });

        const baseUrl = process.env.FRONTEND_URL || 'https://agricfrontend.vercel.app';

        const journalUrls = journals.map(journal => ({
            url: `${baseUrl}/journals/${journal._id}`,
            lastmod: journal.publishedDate ?
                new Date(journal.publishedDate).toISOString().split('T')[0] :
                new Date().toISOString().split('T')[0]
        }));

        res.json(journalUrls);
    } catch (error) {
        console.error('Error getting journals for sitemap:', error);
        res.status(500).json({ message: 'Error getting journals for sitemap' });
    }
});

// Get RSS feed
router.get('/rss.xml', async (req, res) => {
    try {
        const baseUrl = process.env.FRONTEND_URL || 'https://agricfrontend.vercel.app';
        
        // Get latest 20 published journals
        const journals = await Journal.find({ status: 'published' })
            .sort({ publishedDate: -1 })
            .limit(20);

        let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>Nigerian Journal of Business and Entrepreneurship Education (NIJOBED)</title>
        <link>${baseUrl}</link>
        <description>Latest research articles from NIJOBED - Nigeria's premier academic journal for business and entrepreneurship education</description>
        <language>en-us</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <atom:link href="${baseUrl}/api/seo/rss.xml" rel="self" type="application/rss+xml"/>`;

        journals.forEach(journal => {
            const pubDate = journal.publishedDate ? 
                new Date(journal.publishedDate).toUTCString() : 
                new Date().toUTCString();
            
            rss += `
        <item>
            <title><![CDATA[${journal.title}]]></title>
            <link>${baseUrl}/journals/${journal._id}</link>
            <description><![CDATA[${journal.abstract || 'Read this article from JOVOTE'}]]></description>
            <pubDate>${pubDate}</pubDate>
            <guid>${baseUrl}/journals/${journal._id}</guid>
            <author><![CDATA[${journal.authors ? journal.authors.join(', ') : 'JOVOTE'}]]></author>
        </item>`;
        });

        rss += `
    </channel>
</rss>`;

        res.set('Content-Type', 'application/rss+xml');
        res.send(rss);
    } catch (error) {
        console.error('Error generating RSS feed:', error);
        res.status(500).json({ message: 'Error generating RSS feed' });
    }
});

module.exports = router;
