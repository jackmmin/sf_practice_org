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
    @api answerTypeFilter; // array of 'single' | 'multiple', only used for mock/exam

    isLoading = true;
    error;
    rawData;
    runQuestions = [];

    currentIndex = 0;
    answersByQuestionId = {};
    revealedIds = new Set();
    isFinished = false;
    isJumpOpen = false;

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
        let pool = this.rawData || [];

        if (this.mode !== 'browse' && this.answerTypeFilter && this.answerTypeFilter.length > 0) {
            const wantSingle = this.answerTypeFilter.includes('single');
            const wantMultiple = this.answerTypeFilter.includes('multiple');
            if (wantSingle !== wantMultiple) {
                pool = pool.filter((q) => {
                    const keys = (q.Correct_Answer__c || '')
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean);
                    return wantMultiple ? keys.length > 1 : keys.length <= 1;
                });
            }
        }

        const shuffled = shuffle(pool);
        const limited =
            this.mode === 'browse' ? shuffled : shuffled.slice(0, this.questionCount || shuffled.length);
        this.runQuestions = limited.map((q, idx) => this.formatQuestion(q, idx));
        this.currentIndex = 0;
        this.answersByQuestionId = {};
        this.revealedIds = new Set();
        this.isFinished = false;
        this.isJumpOpen = false;
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
            checkAnswerLabel: revealed ? '정답 숨기기' : '정답확인',
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
        return `${this.totalCount - this.answeredCount}문제 남음`;
    }

    get questionOptions() {
        return this.runQuestions.map((q, idx) => {
            const answered = (this.answersByQuestionId[q.id] || []).length > 0;
            const showAnswered = this.isMockOrExam && answered;
            let itemClass = 'qb-jump-item';
            if (idx === this.currentIndex) {
                itemClass += ' qb-jump-item-current';
            }
            if (showAnswered) {
                itemClass += ' qb-jump-item-answered';
            }
            return {
                value: String(idx),
                number: idx + 1,
                showAnswered,
                itemClass
            };
        });
    }

    get jumpPanelClass() {
        return this.isJumpOpen ? 'qb-jump-panel qb-jump-panel-open' : 'qb-jump-panel';
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
        this.isJumpOpen = false;
        if (!this.isFirst) {
            this.currentIndex -= 1;
        }
    }

    handleNext() {
        this.isJumpOpen = false;
        if (!this.isLast) {
            this.currentIndex += 1;
        }
    }

    handleToggleJump() {
        this.isJumpOpen = !this.isJumpOpen;
    }

    handleCloseJump() {
        this.isJumpOpen = false;
    }

    handleJumpSelect(event) {
        const idx = parseInt(event.currentTarget.dataset.index, 10);
        this.currentIndex = idx;
        this.isJumpOpen = false;
    }

    handleCheckAnswer() {
        this.isJumpOpen = false;
        const q = this.runQuestions[this.currentIndex];
        const next = new Set(this.revealedIds);
        if (next.has(q.id)) {
            next.delete(q.id);
        } else {
            next.add(q.id);
        }
        this.revealedIds = next;
    }

    handleEnd() {
        this.isJumpOpen = false;
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
