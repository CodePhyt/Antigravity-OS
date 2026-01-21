import fs from 'fs';
import path from 'path';
import { ShieldCheck, Scale } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

export default function Constitution() {
  const filePath = path.join(process.cwd(), 'directives', '00_GLOBAL_STEERING.md');
  let content = '';
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    content = 'Constitution file not found.';
  }

  const articles: { title: string; content: string }[] = [];
  const lines = content.split('\n');
  let currentArticle = null;

  for (const line of lines) {
    if (line.startsWith('## Article')) {
      if (currentArticle) articles.push(currentArticle);
      currentArticle = { title: line.replace('##', '').trim(), content: '' };
    } else if (currentArticle) {
      currentArticle.content += line + '\n';
    }
  }
  if (currentArticle) articles.push(currentArticle);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="border-b border-white/5 pb-6">
        <h2 className="text-3xl font-bold text-amber-200 flex items-center gap-3">
          <Scale className="text-amber-400" /> SUPREME DIRECTIVE
        </h2>
        <p className="text-xs font-mono text-muted-foreground mt-2">
          CONSTITUTIONAL LAW // IMMUTABLE
        </p>
      </header>

      <div className="grid gap-6 max-w-4xl mx-auto">
        {articles.map((article, i) => (
          <GlassCard key={i} className="border-l-4 border-l-amber-500/50" neonColor="rose">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShieldCheck size={48} />
            </div>
            <h3 className="text-xl font-bold text-amber-100 mb-4 font-serif tracking-wide border-b border-white/5 pb-2">
              {article.title}
            </h3>
            <div className="prose prose-invert prose-sm text-gray-400 font-mono leading-relaxed whitespace-pre-wrap">
              {article.content.trim()}
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="text-center pt-10">
        <div className="inline-block px-4 py-2 border border-amber-500/30 rounded text-amber-500/50 text-[10px] tracking-[0.3em]">
          SIGNED: MASTER OPERATOR
        </div>
      </div>
    </div>
  );
}
