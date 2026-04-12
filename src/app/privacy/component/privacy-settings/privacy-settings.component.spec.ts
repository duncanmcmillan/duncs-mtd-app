import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';
import { PrivacySettingsComponent } from './privacy-settings.component';
import { PrivacyService } from '../../service/privacy.service';
import { AuthStore } from '../../../auth/store/auth.store';

describe('PrivacySettingsComponent', () => {
  let component: PrivacySettingsComponent;
  let fixture: ComponentFixture<PrivacySettingsComponent>;
  let deleteAllData: ReturnType<typeof vi.fn>;
  let signOut: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    deleteAllData = vi.fn().mockResolvedValue(undefined);
    signOut = vi.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [PrivacySettingsComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: PrivacyService, useValue: { deleteAllData } },
        { provide: AuthStore, useValue: { signOut } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrivacySettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the privacy heading', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Privacy');
  });

  it('should render the Delete All My Data button', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Delete All My Data');
  });

  it('deleteAllData() calls privacyService.deleteAllData and authStore.signOut', async () => {
    await component.deleteAllData();
    expect(deleteAllData).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
  });

  it('deleteAllData() sets error signal on failure', async () => {
    deleteAllData.mockRejectedValue(new Error('disk full'));
    await component.deleteAllData();
    const errorSignal = (component as unknown as { error: () => string | null }).error;
    expect(errorSignal()).toBe('disk full');
  });
});
