const fs = require('fs');
let content = fs.readFileSync('c:/Users/MC VIP/OneDrive/Documents/project/frontend/src/components/boards/BoardCardDetailsModal.tsx', 'utf-8');

// Global replacements
content = content.split('TaskDetailsModal').join('BoardCardDetailsModal');
content = content.split('taskId').join('cardId');
content = content.split('taskStack').join('cardStack');
content = content.split('setTaskStack').join('setCardStack');
content = content.split('taskHistory').join('cardHistory');
content = content.split('setTaskHistory').join('setCardHistory');
content = content.split('task').join('card');
content = content.split('Task').join('Card'); // For Task -> Card
content = content.split('setCard').join('setCard'); 
content = content.split('fetchCardDetails').join('fetchCardDetails');
content = content.split('currentCardId').join('currentCardId');
content = content.split('updateCardField').join('updateCardField');
content = content.split('onCardUpdate').join('onCardUpdate');
content = content.split('/projects/cards/').join('/boards/cards/'); // Because task -> card happened

// Fix Add Subtask endpoint specifically
content = content.split('`${API_BASE}/projects/${pId}/add_card/`').join('`${API_BASE}/boards/cards/${currentCardId}/add_subtask/`');
content = content.split('parent_card_id').join('parent_card_id');

// Replace specific card -> task cases where it was wrong
content = content.split('onCardUpdate?: () => void;').join('onCardUpdate?: () => void;');

fs.writeFileSync('c:/Users/MC VIP/OneDrive/Documents/project/frontend/src/components/boards/BoardCardDetailsModal.tsx', content);
