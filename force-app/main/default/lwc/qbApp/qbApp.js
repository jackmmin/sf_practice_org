import { LightningElement } from 'lwc';

const MODE_LABELS = {
    browse: '문제 확인하기',
    mock: '모의고사'
};

export default class QbApp extends LightningElement {
    step = 'mode'; // mode | certification | browse | resume | count | quiz

    selectedMode;
    selectedCertificationId;
    selectedCertificationName;
    selectedTotalCount;
    selectedCount;
    selectedAnswerTypeFilter = [];
    resumeInfo;

    get isModeStep() {
        return this.step === 'mode';
    }

    get isCertificationStep() {
        return this.step === 'certification';
    }

    get isBrowseStep() {
        return this.step === 'browse';
    }

    get isResumeStep() {
        return this.step === 'resume';
    }

    get isCountStep() {
        return this.step === 'count';
    }

    get isQuizStep() {
        return this.step === 'quiz';
    }

    get modeLabel() {
        return MODE_LABELS[this.selectedMode] || '';
    }

    get showBackButton() {
        return this.step !== 'mode';
    }

    get breadcrumb() {
        const parts = [];
        if (this.selectedMode) {
            parts.push(this.modeLabel);
        }
        if (this.selectedCertificationName) {
            parts.push(this.selectedCertificationName);
        }
        return parts.join(' / ');
    }

    get progressKey() {
        return `qb_progress::${this.selectedCertificationId}::mock`;
    }

    handleModeSelect(event) {
        this.selectedMode = event.detail.mode;
        this.step = 'certification';
    }

    handleCertificationSelect(event) {
        const { certificationId, certificationName, totalCount } = event.detail;
        this.selectedCertificationId = certificationId;
        this.selectedCertificationName = certificationName;
        this.selectedTotalCount = totalCount;

        if (this.selectedMode === 'browse') {
            this.step = 'browse';
            return;
        }

        const saved = this.readSavedProgress();
        if (saved) {
            this.resumeInfo = {
                answered: Object.keys(saved.answersByQuestionId || {}).length,
                total: Array.isArray(saved.orderedQuestionIds) ? saved.orderedQuestionIds.length : 0
            };
            this.step = 'resume';
        } else {
            this.step = 'count';
        }
    }

    readSavedProgress() {
        try {
            const raw = window.localStorage.getItem(this.progressKey);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    clearSavedProgress() {
        try {
            window.localStorage.removeItem(this.progressKey);
        } catch (e) {
            // ignore
        }
    }

    handleResumeContinue() {
        this.step = 'quiz';
    }

    handleResumeRestart() {
        this.clearSavedProgress();
        this.resumeInfo = undefined;
        this.step = 'count';
    }

    handleStart(event) {
        this.selectedCount = event.detail.count;
        this.selectedAnswerTypeFilter = event.detail.answerTypeFilter || [];
        this.step = 'quiz';
    }

    handleBack() {
        if (
            this.step === 'browse' ||
            this.step === 'resume' ||
            this.step === 'count' ||
            this.step === 'quiz'
        ) {
            this.step = 'certification';
        } else if (this.step === 'certification') {
            this.step = 'mode';
            this.selectedMode = undefined;
        }
    }

    handleHome() {
        this.step = 'mode';
        this.selectedMode = undefined;
        this.selectedCertificationId = undefined;
        this.selectedCertificationName = undefined;
        this.selectedTotalCount = undefined;
        this.selectedCount = undefined;
        this.selectedAnswerTypeFilter = [];
        this.resumeInfo = undefined;
    }
}
