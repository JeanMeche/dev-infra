/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {TestBed, discardPeriodicTasks, fakeAsync, tick} from '@angular/core/testing';

import {WINDOW} from '../providers';

import {TableOfContentsLoader} from './table-of-contents-loader.service';
import {SCROLL_EVENT_DELAY, TableOfContentsScrollSpy} from './table-of-contents-scroll-spy.service';
import {DOCUMENT, ViewportScroller} from '@angular/common';
import {TableOfContentsLevel} from '../interfaces';

describe('TableOfContentsScrollSpy', () => {
  let service: TableOfContentsScrollSpy;
  let tableOfContentsLoaderSpy: jasmine.SpyObj<TableOfContentsLoader>;
  const fakeWindow = {
    addEventListener: () => {},
    removeEventListener: () => {},
    scrollY: 0,
  };
  const fakeToCItems = [
    {
      id: 'h2',
      level: TableOfContentsLevel.H2,
      title: 'h2',
      top: 100,
    },
    {
      id: 'first',
      level: TableOfContentsLevel.H3,
      title: 'first',
      top: 400,
    },
    {
      id: 'second',
      level: TableOfContentsLevel.H3,
      title: 'second',
      top: 900,
    },
    {
      id: 'third',
      level: TableOfContentsLevel.H3,
      title: 'third',
      top: 1200,
    },
    {
      id: 'fourth',
      level: TableOfContentsLevel.H3,
      title: 'fourth',
      top: 1900,
    },
  ];

  beforeEach(() => {
    tableOfContentsLoaderSpy = jasmine.createSpyObj<TableOfContentsLoader>(
      'TableOfContentsLoader',
      ['tableOfContentItems', 'updateHeadingsTopValue'],
    );
    tableOfContentsLoaderSpy.tableOfContentItems = fakeToCItems;

    TestBed.configureTestingModule({
      providers: [
        TableOfContentsScrollSpy,
        {
          provide: WINDOW,
          useValue: fakeWindow,
        },
        {
          provide: TableOfContentsLoader,
          useValue: tableOfContentsLoaderSpy,
        },
      ],
    });
    service = TestBed.inject(TableOfContentsScrollSpy);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should activeItemId be null by default', () => {
    expect(service.activeItemId()).toBeNull();
  });

  it('should call scrollToPosition([0, 0]) once scrollToTop was invoked', () => {
    const scrollToPositionSpy = spyOn<ViewportScroller>(
      service['viewportScroller'],
      'scrollToPosition',
    );

    service.scrollToTop();

    expect(scrollToPositionSpy).toHaveBeenCalledOnceWith([0, 0]);
  });

  it(`should only fire setActiveItemId every ${SCROLL_EVENT_DELAY}ms when scrolling`, fakeAsync(() => {
    const doc = TestBed.inject(DOCUMENT);
    const scrollableContainer = doc;
    const setActiveItemIdSpy = spyOn(service as any, 'setActiveItemId');

    service.startListeningToScroll(doc.querySelector('fake-selector'));

    scrollableContainer.dispatchEvent(new Event('scroll'));
    tick(SCROLL_EVENT_DELAY - 2);

    expect(setActiveItemIdSpy).not.toHaveBeenCalled();

    scrollableContainer.dispatchEvent(new Event('scroll'));
    tick(1);

    expect(setActiveItemIdSpy).not.toHaveBeenCalled();

    scrollableContainer.dispatchEvent(new Event('scroll'));
    tick(1);

    expect(setActiveItemIdSpy).toHaveBeenCalled();

    discardPeriodicTasks();
  }));

  it(`should set active item when window scrollY is greater than calculated section top value`, fakeAsync(() => {
    const doc = TestBed.inject(DOCUMENT);
    const scrollableContainer = doc;

    service.startListeningToScroll(doc.querySelector('fake-selector'));

    fakeWindow.scrollY = 1238;
    scrollableContainer.dispatchEvent(new Event('scroll'));
    tick(SCROLL_EVENT_DELAY);

    expect(service.activeItemId()).toEqual('third');

    discardPeriodicTasks();
  }));

  it(`should set null as active item when window scrollY is lesser than the top value of the first section`, fakeAsync(() => {
    const doc = TestBed.inject(DOCUMENT);
    const scrollableContainer = doc;

    service.startListeningToScroll(doc.querySelector('fake-selector'));

    fakeWindow.scrollY = 99;
    scrollableContainer.dispatchEvent(new Event('scroll'));
    tick(SCROLL_EVENT_DELAY);

    expect(service.activeItemId()).toEqual(null);

    discardPeriodicTasks();
  }));
});
