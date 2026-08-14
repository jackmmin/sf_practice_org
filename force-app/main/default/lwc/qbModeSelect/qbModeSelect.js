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
            description: '원하는 문항 수를 골라 부담없이 연습합니다.',
            icon: 'utility:knowledge_base'
        },
        {
            value: 'exam',
            title: '시험',
            description: '문항 수를 정해 실전처럼 응시합니다.',
            icon: 'utility:trophy'
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
