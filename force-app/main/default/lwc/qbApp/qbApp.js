import { LightningElement } from 'lwc';

const MODE_LABELS = {
    browse: '문제 확인하기',
    mock: '모의고사',
    exam: '시험'
};

export default class QbApp extends LightningElement {
    step = 'mode'; // mode | certification | browse | count | quiz

    selectedMode;
    selectedCertificationId;
    selectedCertificationName;
    selectedTotalCount;
    selectedCount;
    selectedAnswerTypeFilter = [];

    get isModeStep() {
        return this.step === 'mode';
    }

    get isCertificationStep() {
        return this.step === 'certification';
    }

    get isBrowseStep() {
        return this.step === 'browse';
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

    handleModeSelect(event) {
        this.selectedMode = event.detail.mode;
        this.step = 'certification';
    }

    handleCertificationSelect(event) {
        const { certificationId, certificationName, totalCount } = event.detail;
        this.selectedCertificationId = certificationId;
        this.selectedCertificationName = certificationName;
        this.selectedTotalCount = totalCount;
        this.step = this.selectedMode === 'browse' ? 'browse' : 'count';
    }

    handleStart(event) {
        this.selectedCount = event.detail.count;
        this.selectedAnswerTypeFilter = event.detail.answerTypeFilter || [];
        this.step = 'quiz';
    }

    handleBack() {
        if (this.step === 'browse' || this.step === 'count' || this.step === 'quiz') {
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
    }
}
