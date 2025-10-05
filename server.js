const express = require('express');
const axios = require('axios');
const { JSDOM } = require('jsdom');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/down', async (req, res) => {
    try {
        const videoUrl = req.query.url;
        
        if (!videoUrl) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        const formData = new URLSearchParams();
        formData.append('sf_url', videoUrl);
        formData.append('new', '2');
        formData.append('lang', 'en');
        formData.append('app', '');
        formData.append('country', 'bd');
        formData.append('os', 'Android');
        formData.append('browser', 'Chrome WebView');
        formData.append('channel', 'main');

        const response = await axios.post('https://en1.savefrom.net/savefrom.php', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 30000
        });

        const dom = new JSDOM(response.data);
        const document = dom.window.document;

        const result = {
            success: true,
            videoInfo: {},
            downloadLinks: []
        };

        const titleElement = document.querySelector('.info-box .row.title');
        if (titleElement) {
            result.videoInfo.title = titleElement.textContent.trim();
        }

        const durationElement = document.querySelector('.info-box .row.duration');
        if (durationElement) {
            result.videoInfo.duration = durationElement.textContent.trim();
        }

        const downloadButtons = document.querySelectorAll('.link-download, .download-btn, .def-btn-name');
        
        downloadButtons.forEach(button => {
            const link = button.href || button.getAttribute('data-link');
            const quality = button.textContent.trim();
            
            if (link && link.startsWith('http')) {
                result.downloadLinks.push({
                    quality: quality,
                    url: link,
                    direct: true
                });
            }
        });

        const hiddenLinks = document.querySelectorAll('.link-box .links a[href*="download"]');
        hiddenLinks.forEach(link => {
            if (link.href && link.href.startsWith('http')) {
                result.downloadLinks.push({
                    quality: link.textContent.trim(),
                    url: link.href,
                    direct: true
                });
            }
        });

        if (result.downloadLinks.length === 0) {
            const allLinks = document.querySelectorAll('a[href*="download"]');
            allLinks.forEach(link => {
                if (link.href && link.href.startsWith('http') && !link.href.includes('savefrom.net')) {
                    result.downloadLinks.push({
                        quality: link.textContent.trim() || 'Unknown Quality',
                        url: link.href,
                        direct: true
                    });
                }
            });
        }

        if (result.downloadLinks.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'No download links found',
                rawHtml: response.data 
            });
        }

        res.json(result);

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

app.get('/', (req, res) => {
    res.json({
        message: 'Video Downloader API',
        usage: 'GET /down?url=YOUR_VIDEO_URL',
        example: 'GET /down?url=https://www.youtube.com/watch?v=VIDEO_ID',
        supported: ['YouTube', 'Facebook', 'Instagram', 'Twitter', 'TikTok', 'Dailymotion', 'Vimeo', 'VK', 'SoundCloud', 'Reddit', 'Threads', 'Xiaohongshu']
    });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
