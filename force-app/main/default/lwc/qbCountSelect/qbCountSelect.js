import { LightningElement, api } from 'lwc';

export default class QbCountSelect extends LightningElement {
    @api mode; // 'mock' | 'exam'
    @api certificationId;
    @api certificationName;
    @api totalCount;

    count;

    connectedCallback() {
        this.count = this.defaultCount;
    }

    get defaultCount() {
        const total = this.totalCount || 0;
        if (total === 0) {
            return 1;
        }
        return Math.min(total, 50);
    }

    get modeLabel() {
        return this.mode === 'exam' ? '시험' : '모의고사';
    }

    get quickOptions() {
        const total = this.totalCount || 0;
        const candidates = [10, 25, 50, 100].filter((n) => n < total);
        candidates.push(total);
        return [...new Set(candidates)].filter((n) => n > 0);
    }

    get isStartDisabled() {
        return !this.count || this.count < 1 || this.count > this.totalCount;
    }

    handleChange(event) {
        const value = parseInt(event.target.value, 10);
        this.count = Number.isNaN(value) ? undefined : value;
    }

    handleQuickSelect(event) {
        const value = parseInt(event.currentTarget.dataset.value, 10);
        this.count = value;
    }

    handleStart() {
        if (this.isStartDisabled) {
            return;
        }
        this.dispatchEvent(new CustomEvent('start', { detail: { count: this.count } }));
    }
}
