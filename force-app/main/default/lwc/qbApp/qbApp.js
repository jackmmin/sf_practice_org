import { LightningElement } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const MODE_LABELS = {
    browse: '문제 확인하기',
    mock: '모의고사',
    exam: '시험'
};

export default class QbApp extends LightningElement {
    step = 'mode'; // mode | certification | browse | count

    selectedMode;
    selectedCertificationId;
    selectedCertificationName;
    selectedTotalCount;

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
        const { count } = event.detail;
        this.dispatchEvent(
            new ShowToastEvent({
                title: `${this.modeLabel} 준비 완료`,
                message: `${this.selectedCertificationName} · ${count}문항으로 시작합니다. (문제 풀이 화면은 다음 단계에서 연결 예정입니다)`,
                variant: 'success'
            })
        );
    }

    handleBack() {
        if (this.step === 'browse' || this.step === 'count') {
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
    }
}
