import { LightningElement } from 'lwc';

export default class QbModeSelect extends LightningElement {
    modes = [
        {
            value: 'browse',
            title: '문제 확인하기',
            description: '전체 문제와 정답, 해설을 자유롭게 살펴봅니다.',
            icon: 'utility:preview'
        },
        {
            value: 'mock',
            title: '모의고사',
            description: '원하는 문항 수를 골라 연습합니다. 진행 중 기록은 이어서 풀 수 있습니다.',
            icon: 'utility:knowledge_base'
        }
    ];

    handleSelect(event) {
        const mode = event.currentTarget.dataset.mode;
        this.dispatchEvent(new CustomEvent('modeselect', { detail: { mode } }));
    }

    handleKeyup(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            this.handleSelect(event);
        }
    }
}
