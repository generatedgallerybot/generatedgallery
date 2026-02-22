# GeneratedGallery.com

A free AI-generated art gallery where users can upload, search, upvote, and download AI-generated images crawled from across the internet.

## 🎨 Features

- **Browse AI Art**: Explore thousands of AI-generated images
- **Smart Search**: Search by title, description, or prompt
- **Category Filtering**: Browse by art style and subject matter
- **Upvote System**: Community-driven image ranking
- **Download Images**: Free downloads of all images
- **Upload Interface**: Share your own AI-generated art
- **Mobile Responsive**: Works perfectly on all devices
- **Dark Theme**: Modern, eye-friendly design

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (for uploads)
- **Deployment**: Vercel

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/generatedgallery.git
   cd generatedgallery
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Set up the database**
   
   Run the database schema setup:
   ```bash
   npm run setup-db
   ```
   
   Or manually execute the SQL in `schema.sql` through the Supabase dashboard.

5. **Seed the database**
   
   Run the crawler to populate with initial images:
   ```bash
   npm run crawl
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open the application**
   
   Visit [http://localhost:3000](http://localhost:3000)

## 📊 Database Schema

### Images Table
```sql
CREATE TABLE images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  description TEXT,
  prompt TEXT,
  negative_prompt TEXT,
  model TEXT,
  source_url TEXT,
  source_site TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INT,
  height INT,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  upvotes INT DEFAULT 0,
  downloads INT DEFAULT 0,
  views INT DEFAULT 0,
  is_nsfw BOOLEAN DEFAULT FALSE,
  uploaded_by TEXT,
  crawled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Categories Table
```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  count INT DEFAULT 0
);
```

### Votes Table
```sql
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_id UUID REFERENCES images(id) ON DELETE CASCADE,
  voter_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(image_id, voter_ip)
);
```

## 🤖 Image Crawler

The crawler automatically fetches AI-generated images from various sources:

- **Lexica.art**: Public API for Stable Diffusion images
- **Civitai.com**: Community-generated AI art
- **Auto-categorization**: Automatically categorizes images based on prompts
- **Tag extraction**: Extracts relevant tags from image prompts
- **Duplicate prevention**: Checks for existing images before insertion

### Running the Crawler

```bash
# Run once to seed the database
npm run crawl

# Or run the crawler programmatically
node scripts/crawler.js
```

## 📁 Project Structure

```
generatedgallery/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── image/[id]/        # Individual image page
│   │   ├── upload/            # Image upload page
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Homepage
│   ├── components/            # Reusable React components
│   │   ├── ImageGrid.tsx      # Masonry image grid
│   │   ├── SearchBar.tsx      # Search functionality
│   │   ├── CategoryFilter.tsx # Category filtering
│   │   └── Navbar.tsx         # Navigation bar
│   ├── lib/                   # Utility functions
│   │   ├── supabase.ts        # Supabase client and helpers
│   │   └── database.types.ts  # TypeScript types for database
│   └── types/                 # TypeScript type definitions
├── scripts/
│   └── crawler.js             # Image crawler script
├── schema.sql                 # Database schema
└── setup-db.js               # Database setup script
```

## 🔧 Configuration

### Categories

The system includes 16 predefined categories:
- Product Photography
- Portraits
- Landscapes
- Architecture
- Abstract
- Animals
- Food
- Fashion
- Interior Design
- Vehicles
- Fantasy
- Sci-Fi
- Anime
- Photorealistic
- Digital Art
- 3D Render

### Auto-tagging

The crawler automatically extracts tags from image prompts using keyword matching for common AI art terms.

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically with each push

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-key
```

## 📈 Scaling Considerations

- **Database**: Supabase handles scaling automatically
- **Images**: Consider CDN for image delivery at scale
- **Search**: Implement full-text search with PostgreSQL or Elasticsearch
- **Caching**: Add Redis for frequently accessed data
- **Rate Limiting**: Implement API rate limiting for public endpoints

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- Public read access, controlled write access
- IP-based voting to prevent spam
- NSFW content filtering

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Lexica.art](https://lexica.art) for providing accessible AI art
- [Civitai](https://civitai.com) for their amazing AI art community
- [Supabase](https://supabase.com) for the excellent backend platform
- [Next.js](https://nextjs.org) for the fantastic React framework
- [Tailwind CSS](https://tailwindcss.com) for the utility-first CSS framework

---

Built with ❤️ for the AI art community