import arts from '../../brand/category-icons/svg-website/cat-arts.svg?raw';
import books from '../../brand/category-icons/svg-website/cat-books.svg?raw';
import community from '../../brand/category-icons/svg-website/cat-community.svg?raw';
import games from '../../brand/category-icons/svg-website/cat-games.svg?raw';
import learning from '../../brand/category-icons/svg-website/cat-learning.svg?raw';
import music from '../../brand/category-icons/svg-website/cat-music.svg?raw';
import other from '../../brand/category-icons/svg-website/cat-other.svg?raw';
import outdoors from '../../brand/category-icons/svg-website/cat-outdoors.svg?raw';
import spirituality from '../../brand/category-icons/svg-website/cat-spirituality.svg?raw';

const ICONS: Record<string, string> = {
  'Books & Literature': books,
  'Arts, Culture & Heritage': arts,
  'Music, Comedy & Open Mics': music,
  'Games, Quizzing & Pop Culture': games,
  'Sports, Fitness & Outdoors': outdoors,
  'Social, Impact & Families': community,
  'Tech, Science & Business': learning,
  'Food, Lifestyle & Hobbies': other,
  'Spirituality & Mindfulness': spirituality,
};

export function categoryIcon(name: string): string {
  return ICONS[name] ?? '';
}
