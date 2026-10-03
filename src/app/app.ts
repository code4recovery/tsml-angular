import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { SETTINGS } from './settings';

@Component({
  selector: 'tsml-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <a class="skip" href="#main">Skip to meetings</a>
    <header class="masthead">
      <a routerLink="/" class="title">{{ title }}</a>
    </header>
    <main id="main">
      <router-outlet />
    </main>
  `,
  styles: `
    .skip { position: absolute; left: -999px; }
    .skip:focus { left: 1rem; top: 1rem; background: var(--surface); padding: .5rem 1rem; z-index: 10; }
    .masthead { max-width: 1200px; margin: 0 auto; padding: 1.5rem 1rem .5rem; }
    .title {
      font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 700;
      color: var(--ink); letter-spacing: -0.01em;
    }
    .title:hover { text-decoration: none; color: var(--link); }
    main { max-width: 1200px; margin: 0 auto; padding: 0 1rem 4rem; }
  `,
})
export class App {
  title = SETTINGS.title;
}
