// Copyright 2020 the .NET Foundation
// Licensed under the MIT License

import Vue from "vue";
import { Module, VuexModule, Mutation, MutationAction, Action } from 'vuex-module-decorators';

import { D2R, H2R } from "@wwtelescope/astro";
import { ImageSetType, WWTSetting } from "@wwtelescope/engine-types";
import { Folder, Imageset } from "@wwtelescope/engine";
import { GotoTargetOptions, SetupForImagesetOptions, WWTInstance } from "@wwtelescope/engine-helpers";

interface WWTLinkedCallback {
  (): void;
}

export class WWTGlobalState {
  inst: WWTInstance | null = null;
  onLinkedCallbacks: WWTLinkedCallback[] = [];

  link(inst: WWTInstance): void {
    if (this.inst !== null)
      throw new Error("must unlink WWT Vuex global state before relinking");

    this.inst = inst;

    for (const cb of this.onLinkedCallbacks) {
      cb();
    }

    this.onLinkedCallbacks = [];
  }

  unlink(): void {
    this.inst = null;
  }
}

/** This interface expresses the properties exposed by the WWT Engine’s
 * Vuex store module.
 */
export interface WWTEngineVuexState {
  /** The current imageset acting as the background imagery, if defined. */
  backgroundImageset: Imageset | null;

  /** The current WWT clock time of the view, as a UTC Date. */
  currentTime: Date;

  /** The current declination of the view, in radians.
   *
   * TODO: define this properly for planetary lat/lng views!
   */
  decRad: number;

  /** The current imageset acting as the foreground imagery, if defined. */
  foregroundImageset: Imageset | null;

  /** The opacity with which the foreground imageset is rendered; valid
   * values are between 0 and 100 (inclusive).
   */
  foregroundOpacity: number;

  /** Whether the tour playback mode is active.
   *
   * Specifically, this is true if the `WWTControl` has a `uiController` item
   * that is a `TourPlayer` item. See also [[isTourPlaying]].
   */
  isTourPlayerActive: boolean;

  /** Whether a tour is actively playing righ now.
   *
   * It might be the case that a tour player is active, but the tour is paused.
   */
  isTourPlaying: boolean;

  /** The current right ascension of the view, in radians.
   *
   * TODO: define this properly for planetary lat/lng views!
   */
  raRad: number;

  /** The current mode of the renderer */
  renderType: ImageSetType;

  /** The total run-time of the current tour, if there is one, measured in seconds. */
  tourRunTime: number | null;

  /** The start times of the stops in the tour, measured in seconds.
   *
   * It is possible for tour stops to be linked in a non-linear order, such that
   * actual playback won't proceed linearly in the way that this API would imply.
   */
  tourStopStartTimes: number[];

  /** How far we have progressed into the current tour, in seconds.
   *
   * This number does not necessarily progress monotonically due to the way that
   * WWT measures tour playback progress. We associate a start time with each
   * "stop" in the tour, and can measure progress through a stop, but stops do
   * not necessarily transition from one to another in linear fashion.
   *
   * That being said, this number should range between 0 and the runtime of the
   * current tour. If no tour is loaded, it will be zero.
   */
  tourTimecode: number;
}

/** The parameters for the [[WWTEngineVuexModule.gotoRADecZoom]] action. */
export interface GotoRADecZoomParams {
  /** The right ascension to go to, in radians. */
  raRad: number;

  /** The declination to go to, in radians. */
  decRad: number;

  /** The zoom level to go to, in *degrees*. This is the final angular height of
   * the WWT viewport. */
  zoomDeg: number;

  /** Whether the view should navigate instantly or pan smoothly.
   *
   * Smooth panning is generally preferable from a UX perspective because it
   * gives the engine time to download any data files that it may need to render
   * the view.
   */
  instant: boolean;
}

/** The parameters for the [[WWTEngineVuexModule.loadTour]] action.
 */
export interface LoadTourParams {
  /** The tour URL to load. */
  url: string;

  /** Whether to start playing it immediately. */
  play: boolean;
}

/** The parameters for the [[WWTEngineVuexModule.loadImageCollection]] action. */
export interface LoadImageCollectionParams {
  /** The WTML URL to load. */
  url: string;
}

@Module({
  namespaced: true,
  stateFactory: true,
})
export class WWTEngineVuexModule extends VuexModule implements WWTEngineVuexState {
  backgroundImageset: Imageset | null = null;
  currentTime = new Date();
  decRad = 0.0;
  foregroundImageset: Imageset | null = null;
  foregroundOpacity = 100;
  isTourPlayerActive = false;
  isTourPlaying = false;
  raRad = 0.0;
  renderType = ImageSetType.sky;
  tourRunTime: number | null = null;
  tourStopStartTimes: number[] = [];
  tourTimecode = 0.0;

  get lookupImageset() {
    // This is how you create a parametrized getter in vuex-module-decorators:
    return function (imagesetName: string): Imageset | null {
      if (Vue.$wwt.inst === null)
        throw new Error('cannot lookupImageset without linking to WWTInstance');
      return Vue.$wwt.inst.ctl.getImagesetByName(imagesetName);
    }
  }

  @Mutation
  internalLinkToInstance(wwt: WWTInstance): void {
    Vue.$wwt.link(wwt);
  }

  @Mutation
  internalUnlinkFromInstance(): void {
    Vue.$wwt.unlink();
  }

  @Mutation
  internalUpdate(): void {
    if (Vue.$wwt.inst === null)
      throw new Error('cannot internalUpdate without linking to WWTInstance');

    const wwt = Vue.$wwt.inst;

    const raRad = wwt.si.getRA() * H2R;
    if (this.raRad != raRad)
      this.raRad = raRad;

    const decRad = wwt.si.getDec() * D2R;
    if (this.decRad != decRad)
      this.decRad = decRad;

    const bg = wwt.ctl.renderContext.get_backgroundImageset() || null; // TEMP
    if (this.backgroundImageset != bg)
      this.backgroundImageset = bg;

    const time = wwt.stc.get_now();
    if (this.currentTime != time)
      this.currentTime = time;

    const fg = wwt.ctl.renderContext.get_foregroundImageset() || null; // TEMP
    if (this.foregroundImageset != fg)
      this.foregroundImageset = fg;

    if (this.foregroundOpacity != wwt.ctl.renderContext.viewCamera.opacity)
      this.foregroundOpacity = wwt.ctl.renderContext.viewCamera.opacity;

    if (this.renderType != wwt.ctl.renderType)
      this.renderType = wwt.ctl.renderType;

    const player = wwt.getActiveTourPlayer();
    this.tourTimecode = wwt.getEffectiveTourTimecode();

    if (player !== null) {
      this.isTourPlayerActive = true;
      this.isTourPlaying = wwt.getIsTourPlaying(player);
    } else {
      this.isTourPlayerActive = false;
      this.isTourPlaying = false;
    }
  }

  @Mutation
  applySetting(setting: WWTSetting): void {
    if (Vue.$wwt.inst === null)
      throw new Error('cannot applySetting without linking to WWTInstance');
    Vue.$wwt.inst.applySetting(setting);
  }

  @Mutation
  setBackgroundImageByName(imagesetName: string): void {
    if (Vue.$wwt.inst === null)
      throw new Error('cannot setBackgroundImageByName without linking to WWTInstance');
    Vue.$wwt.inst.setBackgroundImageByName(imagesetName);
  }

  @Mutation
  setForegroundImageByName(imagesetName: string): void {
    if (Vue.$wwt.inst === null)
      throw new Error('cannot setForegroundImageByName without linking to WWTInstance');
    Vue.$wwt.inst.setForegroundImageByName(imagesetName);
  }

  @Mutation
  setForegroundOpacity(opacity: number): void {
    if (Vue.$wwt.inst === null)
      throw new Error('cannot setForegroundOpacity without linking to WWTInstance');
    Vue.$wwt.inst.setForegroundOpacity(opacity);
    this.foregroundOpacity = opacity;
  }

  @Mutation
  setupForImageset(options: SetupForImagesetOptions): void {
    if (Vue.$wwt.inst === null)
      throw new Error('cannot setupForImageset without linking to WWTInstance');
    Vue.$wwt.inst.setupForImageset(options);
  }

  @Mutation
  zoom(factor: number): void {
    if (Vue.$wwt.inst === null)
      throw new Error('cannot zoom without linking to WWTInstance');
    Vue.$wwt.inst.ctl.zoom(factor);
  }

  @Mutation
  startTour(): void {
    if (Vue.$wwt.inst === null)
      throw new Error('cannot start tour without linking to WWTInstance');

    const player = Vue.$wwt.inst.getActiveTourPlayer();
    if (player === null)
      throw new Error('no tour to start');

    player.play();
  }

  @Mutation
  toggleTourPlayPauseState(): void {
    if (Vue.$wwt.inst === null)
      throw new Error('cannot play/pause tour without linking to WWTInstance');

    const player = Vue.$wwt.inst.getActiveTourPlayer();
    if (player === null)
      throw new Error('no tour to play/pause');

    // Despite the unclear name, this function does toggle play/pause state.
    player.pauseTour();
  }

  @Mutation
  setTourPlayerLeaveSettingsWhenStopped(value: boolean): void {
    if (Vue.$wwt.inst === null)
      throw new Error('cannot setTourPlayerLeaveSettingsWhenStopped without linking to WWTInstance');

    const player = Vue.$wwt.inst.getActiveTourPlayer();
    if (player === null)
      throw new Error('no tour player to control');

    player.set_leaveSettingsWhenStopped(value);
  }

  @Mutation
  seekToTourTimecode(value: number): void {
    if (Vue.$wwt.inst === null)
      throw new Error('cannot seekToTourTimecode without linking to WWTInstance');

    Vue.$wwt.inst.seekToTourTimecode(value);
  }

  @Action({ rawError: true })
  async waitForReady(): Promise<void> {
    if (Vue.$wwt.inst !== null) {
      return Vue.$wwt.inst.waitForReady();
    } else {
      return new Promise((resolve, _reject) => {
        const waitThenResolve = (): void => {
          (Vue.$wwt.inst as WWTInstance).waitForReady().then(resolve);
        };

        if (Vue.$wwt.inst !== null) {
          waitThenResolve();
        } else {
          Vue.$wwt.onLinkedCallbacks.push(waitThenResolve);
        }
      });
    }
  }

  @Action({ rawError: true })
  async gotoRADecZoom(
    {raRad, decRad, zoomDeg, instant}: GotoRADecZoomParams
  ): Promise<void> {
    if (Vue.$wwt.inst === null)
      throw new Error('cannot gotoRADecZoom without linking to WWTInstance');
    return Vue.$wwt.inst.gotoRADecZoom(raRad, decRad, zoomDeg, instant);
  }

  @Action({ rawError: true })
  async gotoTarget(options: GotoTargetOptions): Promise<void> {
    if (Vue.$wwt.inst === null)
      throw new Error('cannot gotoTarget without linking to WWTInstance');
    return Vue.$wwt.inst.gotoTarget(options);
  }

  @MutationAction
  async loadTour(
    {url, play}: LoadTourParams
  ) {
    if (Vue.$wwt.inst === null)
      throw new Error('cannot loadTour without linking to WWTInstance');

    if (play)
      await Vue.$wwt.inst.loadAndPlayTour(url);
    else
      await Vue.$wwt.inst.loadTour(url);

    let tourRunTime: number | null = null;
    const tourStopStartTimes: number[] = [];

    const player = Vue.$wwt.inst.getActiveTourPlayer();
    if (player !== null) {
      const tour = player.get_tour();
      if (tour !== null) {
        tourRunTime = tour.get_runTime() * 0.001; // ms => s
        const nStops = tour.get_tourStops().length;

        for (let i = 0; i < nStops; i++) {
          tourStopStartTimes.push(tour.elapsedTimeTillTourstop(i));
        }
      }
    }

    return { tourRunTime, tourStopStartTimes };
  }

  @Action({ rawError: true })
  async loadImageCollection(
    {url}: LoadImageCollectionParams
  ): Promise<Folder> {
    if (Vue.$wwt.inst === null)
      throw new Error('cannot loadImageCollection without linking to WWTInstance');
    return Vue.$wwt.inst.loadImageCollection(url);
  }
}
