import { LightningElement, api, wire } from 'lwc';
import getQuestions from '@salesforce/apex/QuestionBankController.getQuestions';

const PAGE_SIZE = 10;

export default class QbQuestionBrowser extends LightningElement {
    @api certificationId;
    @api certificationName;

    allQuestions = [];
    isLoading = true;
    error;
    searchTerm = '';
    currentPage = 1;
    expandedIds = new Set();

    @wire(getQuestions, { certificationId: '$certificationId' })
    wiredQuestions({ data, error }) {
        this.isLoading = false;
        if (data) {
            this.allQuestions = data.map((q) => this.formatQuestion(q));
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.allQuestions = [];
        }
    }

    formatQuestion(q) {
        const correctKeys = (q.Correct_Answer__c || '')
            .split(',')
            .map((s) => s.trim());

        const options = [
            { key: 'A', label: q.Option_A__c },
            { key: 'B', label: q.Option_B__c },
            { key: 'C', label: q.Option_C__c },
            { key: 'D', label: q.Option_D__c },
            { key: 'E', label: q.Option_E__c },
            { key: 'F', label: q.Option_F__c }
        ]
            .filter((o) => o.label)
            .map((o) => ({
                ...o,
                isCorrect: correctKeys.includes(o.key)
            }));

        return {
            id: q.Id,
            number: q.Question_Number__c,
            text: q.Question_Text__c,
            topic: q.Topic__c,
            correctAnswer: q.Correct_Answer__c,
            explanation: q.Explanation__c,
            options
        };
    }

    get filteredQuestions() {
        const term = this.searchTerm.trim().toLowerCase();
        if (!term) {
            return this.allQuestions;
        }
        return this.allQuestions.filter(
            (q) => (q.text || '').toLowerCase().includes(term) || String(q.number).includes(term)
        );
    }

    get totalPages() {
        return Math.max(1, Math.ceil(this.filteredQuestions.length / PAGE_SIZE));
    }

    get pagedQuestions() {
        const start = (this.currentPage - 1) * PAGE_SIZE;
        return this.filteredQuestions.slice(start, start + PAGE_SIZE).map((q) => {
            const isExpanded = this.expandedIds.has(q.id);
            return {
                ...q,
                isExpanded,
                toggleLabel: isExpanded ? '정답/해설 숨기기' : '정답/해설 보기',
                options: q.options.map((opt) => ({
                    ...opt,
                    optionClass: 'qb-option' + (isExpanded && opt.isCorrect ? ' qb-option-correct' : '')
                }))
            };
        });
    }

    get pageInfo() {
        return `${this.currentPage} / ${this.totalPages} 페이지 (전체 ${this.filteredQuestions.length}문제)`;
    }

    get isFirstPage() {
        return this.currentPage <= 1;
    }

    get isLastPage() {
        return this.currentPage >= this.totalPages;
    }

    get hasQuestions() {
        return !this.isLoading && this.filteredQuestions.length > 0;
    }

    get hasNoResults() {
        return !this.isLoading && !this.error && this.filteredQuestions.length === 0;
    }

    handleSearch(event) {
        this.searchTerm = event.target.value;
        this.currentPage = 1;
    }

    handlePrev() {
        if (!this.isFirstPage) {
            this.currentPage -= 1;
        }
    }

    handleNext() {
        if (!this.isLastPage) {
            this.currentPage += 1;
        }
    }

    handleToggle(event) {
        const id = event.currentTarget.dataset.id;
        const next = new Set(this.expandedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        this.expandedIds = next;
    }
}
