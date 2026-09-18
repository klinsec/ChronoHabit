const fs = require('fs');

const file = 'E:\\IA_programs\\Chronohabit\\ChronoHabit_Improved\\src\\components\\views\\StatsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// The components to remove
const toRemove = [
    'interface DateNavigatorProps {',
    'const DateNavigator: React.FC<DateNavigatorProps> = ({ period, currentDate, setCurrentDate, dateRangeDisplay }) => {',
    'const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {',
    'const RankingTable = ({ data, localUser, title, icon, showFooterSelf = false, onRemoveItem, onAddFriend, friendsList = [], filterZero = false, limit }: any) => {',
    'const AddRewardModal = ({ onClose }: { onClose: () => void }) => {',
    'interface RewardCardProps {',
    'const RewardCard: React.FC<RewardCardProps> = ({ reward, onRedeem, onDelete, canAfford }) => {'
];

// Let's replace the whole blocks using regex
content = content.replace(/interface DateNavigatorProps \{[\s\S]*?(?=const RankBadge)/, '');
content = content.replace(/const RankBadge[\s\S]*?(?=const RankingTable)/, '');
content = content.replace(/const RankingTable[\s\S]*?(?=const RankingView)/, '');
content = content.replace(/const AddRewardModal[\s\S]*?(?=interface RewardCardProps)/, '');
content = content.replace(/interface RewardCardProps[\s\S]*?(?=const RewardsView)/, '');

// Add imports
const imports = `import { DateNavigator } from '@/components/common/DateNavigator';
import { RankBadge } from '@/components/common/RankBadge';
import { RankingTable } from '@/components/common/RankingTable';
import { AddRewardModal } from '@/components/common/AddRewardModal';
import { RewardCard } from '@/components/common/RewardCard';
`;

content = content.replace("import { GoalPeriod, Reward } from '@/types';", "import { GoalPeriod, Reward } from '@/types';\n" + imports);

fs.writeFileSync(file, content, 'utf8');
console.log("StatsView refactored!");
