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
    mock: '모의고사 종료'
};

export default class QbQuizRunner extends LightningElement {
    @api certificationId;
    @api certificationName;
    @api mode; // 'browse' | 'mock'
    @api questionCount; // only used for mock
    @api answerTypeFilter; // array of 'single' | 'multiple', only used for mock

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

    // ---------- Progress persistence (mock mode only) ----------

    get progressKey() {
        return `qb_progress::${this.certificationId}::mock`;
    }

    readSavedProgress() {
        try {
            const raw = window.localStorage.getItem(this.progressKey);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    persistProgress() {
        if (this.mode !== 'mock' || this.isFinished) {
            return;
        }
        try {
            const payload = {
                questionCount: this.questionCount,
                answerTypeFilter: this.answerTypeFilter,
                orderedQuestionIds: this.runQuestions.map((q) => q.id),
                answersByQuestionId: this.answersByQuestionId,
                currentIndex: this.currentIndex,
                savedAt: new Date().toISOString()
            };
            window.localStorage.setItem(this.progressKey, JSON.stringify(payload));
        } catch (e) {
            // storage unavailable/full - non-critical, ignore
        }
    }

    clearSavedProgress() {
        try {
            window.localStorage.removeItem(this.progressKey);
        } catch (e) {
            // ignore
        }
    }

    tryResume() {
        const saved = this.readSavedProgress();
        if (!saved || !Array.isArray(saved.orderedQuestionIds) || saved.orderedQuestionIds.length === 0) {
            return false;
        }
        const byId = new Map((this.rawData || []).map((q) => [q.Id, q]));
        const ordered = saved.orderedQuestionIds.map((id) => byId.get(id)).filter(Boolean);
        if (ordered.length === 0) {
            return false;
        }
        this.runQuestions = ordered.map((q, idx) => this.formatQuestion(q, idx));
        this.answersByQuestionId = saved.answersByQuestionId || {};
        this.currentIndex = Math.min(saved.currentIndex || 0, this.runQuestions.length - 1);
        this.revealedIds = new Set();
        this.isFinished = false;
        this.isJumpOpen = false;
        return true;
    }

    // ---------- Run building ----------

    buildRun(forceFresh) {
        if (!forceFresh && this.mode === 'mock' && this.tryResume()) {
            return;
        }

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
        this.persistProgress();
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

    get isMock() {
        return this.mode === 'mock';
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
        if (!this.isMock) {
            return false;
        }
        return this.answeredCount < this.totalCount;
    }

    get endHint() {
        if (!this.isMock || !this.isEndDisabled) {
            return '';
        }
        return `${this.totalCount - this.answeredCount}문제 남음`;
    }

    get questionOptions() {
        return this.runQuestions.map((q, idx) => {
            const answered = (this.answersByQuestionId[q.id] || []).length > 0;
            const showAnswered = this.isMock && answered;
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
        const correct = this.runQuestions.filter((q) => this.isQuestionCorrect(q)).length;
        return { correct, total: this.totalCount };
    }

    isQuestionCorrect(q) {
        const selected = (this.answersByQuestionId[q.id] || []).slice().sort();
        const correctKeys = q.correctKeys.slice().sort();
        return selected.length > 0 && JSON.stringify(selected) === JSON.stringify(correctKeys);
    }

    get wrongQuestions() {
        if (!this.isMock) {
            return [];
        }
        return this.runQuestions
            .filter((q) => !this.isQuestionCorrect(q))
            .map((q) => {
                const selected = this.answersByQuestionId[q.id] || [];
                return {
                    id: q.id,
                    number: q.displayNumber,
                    text: q.text,
                    topic: q.topic,
                    options: q.options.map((opt) => {
                        const isSelected = selected.includes(opt.key);
                        const isCorrectOpt = q.correctKeys.includes(opt.key);
                        let optionClass = 'qb-run-option qb-run-option-static';
                        if (isCorrectOpt) {
                            optionClass += ' qb-run-option-correct';
                        }
                        if (isSelected && !isCorrectOpt) {
                            optionClass += ' qb-run-option-incorrect';
                        }
                        return { ...opt, optionClass };
                    })
                };
            });
    }

    get hasWrongQuestions() {
        return this.wrongQuestions.length > 0;
    }

    get wrongCount() {
        return this.wrongQuestions.length;
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
        this.persistProgress();
    }

    handlePrev() {
        this.isJumpOpen = false;
        if (!this.isFirst) {
            this.currentIndex -= 1;
            this.persistProgress();
        }
    }

    handleNext() {
        this.isJumpOpen = false;
        if (!this.isLast) {
            this.currentIndex += 1;
            this.persistProgress();
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
        this.persistProgress();
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
        this.clearSavedProgress();
    }

    handleRestart() {
        this.buildRun(true);
    }

    handleBack() {
        this.dispatchEvent(new CustomEvent('back'));
    }
}
