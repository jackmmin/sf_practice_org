import { LightningElement, api, wire } from 'lwc';
import getQuestions from '@salesforce/apex/QuestionBankController.getQuestions';

function shuffle(list) {
    const result = list.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = result[i];
        result[i] = result[j];
        result[j] = tmp;
    }
    return result;
}

const END_LABEL = {
    browse: '학습 종료',
    mock: '모의고사 종료',
    exam: '시험 종료'
};

export default class QbQuizRunner extends LightningElement {
    @api certificationId;
    @api certificationName;
    @api mode; // 'browse' | 'mock' | 'exam'
    @api questionCount; // only used for mock/exam

    isLoading = true;
    error;
    rawData;
    runQuestions = [];

    currentIndex = 0;
    answersByQuestionId = {};
    revealedIds = new Set();
    isFinished = false;

    @wire(getQuestions, { certificationId: '$certificationId' })
    wiredQuestions({ data, error }) {
        this.isLoading = false;
        if (data) {
            this.rawData = data;
            this.error = undefined;
            this.buildRun();
        } else if (error) {
            this.error = error;
        }
    }

    buildRun() {
        const shuffled = shuffle(this.rawData || []);
        const limited =
            this.mode === 'browse' ? shuffled : shuffled.slice(0, this.questionCount || shuffled.length);
        this.runQuestions = limited.map((q, idx) => this.formatQuestion(q, idx));
        this.currentIndex = 0;
        this.answersByQuestionId = {};
        this.revealedIds = new Set();
        this.isFinished = false;
    }

    formatQuestion(q, idx) {
        const options = [
            { key: 'A', label: q.Option_A__c },
            { key: 'B', label: q.Option_B__c },
            { key: 'C', label: q.Option_C__c },
            { key: 'D', label: q.Option_D__c },
            { key: 'E', label: q.Option_E__c },
            { key: 'F', label: q.Option_F__c }
        ].filter((o) => o.label);

        return {
            id: q.Id,
            displayNumber: idx + 1,
            text: q.Question_Text__c,
            topic: q.Topic__c,
            isMultiple: q.Answer_Type__c === 'Multiple Choice',
            correctAnswer: q.Correct_Answer__c,
            correctKeys: (q.Correct_Answer__c || '').split(',').map((s) => s.trim()),
            explanation: q.Explanation__c,
            options
        };
    }

    get isMockOrExam() {
        return this.mode === 'mock' || this.mode === 'exam';
    }

    get totalCount() {
        return this.runQuestions.length;
    }

    get currentQuestion() {
        const q = this.runQuestions[this.currentIndex];
        if (!q) {
            return null;
        }
        const selected = this.answersByQuestionId[q.id] || [];
        const revealed = this.revealedIds.has(q.id);
        return {
            ...q,
            isRevealed: revealed,
            options: q.options.map((opt) => {
                const isSelected = selected.includes(opt.key);
                const isCorrectOpt = q.correctKeys.includes(opt.key);
                let optionClass = 'qb-run-option';
                if (isSelected) {
                    optionClass += ' qb-run-option-selected';
                }
                if (revealed && isCorrectOpt) {
                    optionClass += ' qb-run-option-correct';
                }
                if (revealed && isSelected && !isCorrectOpt) {
                    optionClass += ' qb-run-option-incorrect';
                }
                return { ...opt, isSelected, optionClass };
            })
        };
    }

    get progressLabel() {
        return `${this.currentIndex + 1} / ${this.totalCount}`;
    }

    get currentIndexString() {
        return String(this.currentIndex);
    }

    get isFirst() {
        return this.currentIndex <= 0;
    }

    get isLast() {
        return this.currentIndex >= this.totalCount - 1;
    }

    get endLabel() {
        return END_LABEL[this.mode] || '종료';
    }

    get answeredCount() {
        return this.runQuestions.filter((q) => (this.answersByQuestionId[q.id] || []).length > 0).length;
    }

    get isEndDisabled() {
        if (!this.isMockOrExam) {
            return false;
        }
        return this.answeredCount < this.totalCount;
    }

    get endHint() {
        if (!this.isMockOrExam || !this.isEndDisabled) {
            return '';
        }
        return `아직 풀지 않은 문제가 ${this.totalCount - this.answeredCount}개 있습니다.`;
    }

    get questionOptions() {
        return this.runQuestions.map((q, idx) => {
            const answered = (this.answersByQuestionId[q.id] || []).length > 0;
            const marker = this.isMockOrExam && answered ? '✓ ' : '';
            return {
                label: `${marker}${idx + 1}번`,
                value: String(idx)
            };
        });
    }

    get score() {
        const correct = this.runQuestions.filter((q) => {
            const selected = (this.answersByQuestionId[q.id] || []).slice().sort();
            const correctKeys = q.correctKeys.slice().sort();
            return selected.length > 0 && JSON.stringify(selected) === JSON.stringify(correctKeys);
        }).length;
        return { correct, total: this.totalCount };
    }

    handleSelectOption(event) {
        const optionKey = event.currentTarget.dataset.key;
        const q = this.runQuestions[this.currentIndex];
        const existing = this.answersByQuestionId[q.id] || [];

        let next;
        if (q.isMultiple) {
            next = existing.includes(optionKey)
                ? existing.filter((k) => k !== optionKey)
                : [...existing, optionKey];
        } else {
            next = [optionKey];
        }

        this.answersByQuestionId = { ...this.answersByQuestionId, [q.id]: next };
    }

    handlePrev() {
        if (!this.isFirst) {
            this.currentIndex -= 1;
        }
    }

    handleNext() {
        if (!this.isLast) {
            this.currentIndex += 1;
        }
    }

    handleJump(event) {
        this.currentIndex = parseInt(event.detail.value, 10);
    }

    handleCheckAnswer() {
        const q = this.runQuestions[this.currentIndex];
        const next = new Set(this.revealedIds);
        next.add(q.id);
        this.revealedIds = next;
    }

    handleEnd() {
        if (this.isEndDisabled) {
            return;
        }
        this.isFinished = true;
    }

    handleRestart() {
        this.buildRun();
    }

    handleBack() {
        this.dispatchEvent(new CustomEvent('back'));
    }
}
