// types/blog.ts
export interface Author {
  id: number;
  name: string;
  role: string;
  image: string;
  bio?: string;
}

export interface Article {
  id: string;
  featured?: boolean;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  category: string;
  readTime: string;
  date: string;
  tags: string[];
  author: {
    name: string;
    image: string;
  };
}

export interface ArticleMetadata {
  id: string; 
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  readTime: string;
  date: string;
  tags: string[];
}

export type ArticleCategory = {
  id: string;
  name: string;
  color: string;
  description?: string;
}