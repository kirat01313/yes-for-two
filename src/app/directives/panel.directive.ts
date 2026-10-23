import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';

@Directive({
  selector: '[appPanel]',
  host: { class: 'panel', '(window:resize)': 'fit()' },
})
export class PanelDirective implements AfterViewInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer?: ResizeObserver;

  ngAfterViewInit(): void {
    this.observer = new ResizeObserver(() => this.fit());
    this.observer.observe(this.element.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  fit(): void {
    const panel = this.element.nativeElement;
    panel.style.top = `${Math.min(0, window.innerHeight - panel.offsetHeight)}px`;
  }
}
