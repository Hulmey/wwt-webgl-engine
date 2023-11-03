// Copyright 2020 the .NET Foundation
// Licensed under the MIT License

import {
  BaseEngineSetting,
  enumLookup
} from "@wwtelescope/engine-types";

export enum PlanetaryBodies {
  Sun = "sun",
  Mercury = "mercury",
  Venus = "venus",
  Earth = "earth",
  Mars = "mars",
  Jupiter = "jupiter",
  Saturn = "saturn",
  Uranus = "uranus",
  Neptune = "neptune",
  Pluto = "pluto",
  Moon = "moon",
  Io = "io",
  Europa = "europa",
  Ganymede = "ganymede",
  Callisto = "callisto",
}

export enum CreditMode {
  Default = "default",
  None = "no"
}

export class EmbedSettings {
  backgroundImagesetName = "";
  foregroundImagesetName = "";
  creditMode = CreditMode.Default;
  showCoordinateReadout = false;
  showCrosshairs = false;
  tourUrl = "";
  wtmlUrl = "";
  wtmlPlace = "";

  static fromQueryParams(qp: IterableIterator<[string, string]>): EmbedSettings {
    const s = new EmbedSettings();

    for (const [key, value] of qp) {
      switch (key) {
        case "bg":
          s.backgroundImagesetName = value;
          break;

        case "ch":
          s.showCrosshairs = true;
          break;

        case "cro":
          s.showCoordinateReadout = true;
          break;

        case "cred":
          {
            const m = enumLookup(CreditMode, value);
            if (m !== undefined)
              s.creditMode = m;
          }
          break;

        case "fg":
          s.foregroundImagesetName = value;
          break;

        case "p":
          s.wtmlPlace = value;
          break;

        case "planet":
          if (value == "mars") {
            // Gnarly historical thing that the default Mars imageset
            // is named thusly:
            s.backgroundImagesetName = "Visible Imagery";
            s.foregroundImagesetName = "Visible Imagery";
          } else if (value == "earth") {
            s.backgroundImagesetName = "Bing Maps Aerial";
            s.foregroundImagesetName = "Bing Maps Aerial";
          } else if (value == "pluto") {
            s.backgroundImagesetName = "Pluto (New Horizons)";
            s.foregroundImagesetName = "Pluto (New Horizons)";
          } else {
            s.backgroundImagesetName = value;
            s.foregroundImagesetName = value;
          }
          break;

        case "threed":
          s.backgroundImagesetName = "3D Solar System View";
          s.foregroundImagesetName = "";
          break;

        case "tour":
          s.tourUrl = value;
          break;

        case "wtml":
          s.wtmlUrl = value;
          break;
      }
    }

    return s;
  }

  /** Return a set of
   * [`BaseEngineSetting`](../../engine-types/types/BaseEngineSetting.html)
   * values implied by this configuration. (The `BaseEngineSetting` type is
   * defined in the `@wwtelescope/engine-types` module.)
   *
   * @returns A list of setting values.
   */
  asSettings(): BaseEngineSetting[] {
    const s: BaseEngineSetting[] = [];
    s.push(["showCrosshairs", this.showCrosshairs]);
    return s;
  }
}

/** A class to help building query strings that get parsed into EmbedSettings
 * objects. There are a few shorthands for setups where the "implementation
 * details" are a bit weird or might change.
 */
export class EmbedQueryStringBuilder {
  s: EmbedSettings = new EmbedSettings();
  threeDMode = false;
  planetaryBody: PlanetaryBodies | null = null;

  toQueryItems(): Array<[string, string]> {
    const result: Array<[string, string]> = [];
    const defaults = new EmbedSettings();

    if (this.threeDMode) {
      result.push(["threed", ""]);
    } else if (this.planetaryBody !== null) {
      result.push(["planet", this.planetaryBody]);
    } else {
      if (this.s.backgroundImagesetName.length && this.s.backgroundImagesetName != defaults.backgroundImagesetName)
        result.push(["bg", this.s.backgroundImagesetName]);
      if (this.s.foregroundImagesetName.length && this.s.foregroundImagesetName != defaults.foregroundImagesetName)
        result.push(["fg", this.s.foregroundImagesetName]);
    }

    if (this.s.creditMode && this.s.creditMode != CreditMode.Default) {
      result.push(["cred", this.s.creditMode]);
    }

    if (this.s.showCoordinateReadout) {
      result.push(["cro", ""]);
    }

    if (this.s.showCrosshairs) {
      result.push(["ch", ""]);
    }

    if (this.s.tourUrl.length) {
      result.push(["tour", this.s.tourUrl]);
    }

    if (this.s.wtmlPlace.length) {
      result.push(["p", this.s.wtmlPlace]);
    }

    if (this.s.wtmlUrl.length) {
      result.push(["wtml", this.s.wtmlUrl]);
    }

    return result;
  }
}