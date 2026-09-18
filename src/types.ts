export interface Article {
  title: string;
  url: string;
  publishedAt?: string;
  description?: string;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  description: string;
  discover(previous: Article[]): Promise<Article[]>;
}
