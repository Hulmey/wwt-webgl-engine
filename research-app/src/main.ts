import Vue from "vue";
import VTooltip from "v-tooltip";
import Vuex from "vuex";

import { VNode, VNodeDirective } from "vue";

import vSelect from 'vue-select';
import Chrome from 'vue-color/src/components/Chrome.vue';

import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faAdjust,
  faCompress,
  faExpand,
  faMountain,
  faSearchMinus,
  faSearchPlus,
  faSlidersH,
  faEyeSlash,
  faEye,
  faChevronDown,
  faChevronUp,
  faPlus,
  faWindowClose,
  faTimes,
  faMapMarkedAlt,
  faCircle,
  faMapMarkerAlt,
  faPencilAlt,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import { createPlugin } from "@wwtelescope/engine-vuex";

import App from "./App.vue";
import CatalogItem from "./CatalogItem.vue";
import SourceItem from "./SourceItem.vue";
import TransitionExpand from "./TransitionExpand.vue";
import { WWTResearchAppModule } from "./store";
import { wwtEngineNamespace, wwtResearchAppNamespace } from "./namespaces";

Vue.config.productionTip = false;

Vue.use(VTooltip);
Vue.use(Vuex);

const store = new Vuex.Store({});
store.registerModule(wwtResearchAppNamespace, WWTResearchAppModule);

Vue.use(createPlugin(), {
  store,
  namespace: wwtEngineNamespace,
});

library.add(faAdjust);
library.add(faCompress);
library.add(faExpand);
library.add(faMountain);
library.add(faSearchMinus);
library.add(faSearchPlus);
library.add(faSlidersH);
library.add(faEyeSlash);
library.add(faEye);
library.add(faChevronUp);
library.add(faChevronDown);
library.add(faPlus);
library.add(faWindowClose);
library.add(faTimes);
library.add(faMapMarkedAlt);
library.add(faCircle);
library.add(faMapMarkerAlt);
library.add(faPencilAlt);
Vue.component('font-awesome-icon', FontAwesomeIcon);
Vue.component("v-select", vSelect);
Vue.component('catalog-item', CatalogItem);
Vue.component('source-item', SourceItem);
Vue.component('transition-expand', TransitionExpand);
Vue.component('vue-color-chrome', Chrome);

/** v-hide directive take from https://www.ryansouthgate.com/2020/01/30/vue-js-v-hide-element-whilst-keeping-occupied-space/ */
// Extract the function out, up here, so I'm not writing it twice
const update = (el: HTMLElement,
  binding: VNodeDirective,
  _vnode: VNode,
  _oldVnode: VNode) => el.style.visibility = (binding.value) ? "hidden" : "";

/**
* Hides an HTML element, keeping the space it would have used if it were visible (css: Visibility)
*/
Vue.directive("hide", {
  // Run on initialisation (first render) of the directive on the element
  bind: update,
  // Run on subsequent updates to the value supplied to the directive
  update: update
});

// If postMessages are to be allowed, our creator has to tell us where they'll
// come from. This only trivially prevents unexpected messages; it of course
// does nothing about XSS where someone loads us up inside an iframe that they
// control. This is OK because right now this app has no sense of user logins or
// other credentials that can be abused.
const queryParams = new URLSearchParams(window.location.search);
const allowedOrigin = queryParams.get('origin');
if (allowedOrigin === null) {
  console.log("WWT embed: no \"?origin=\" given, so no incoming messages will be allowed")
}

new Vue({
  store,
  el: "#app",
  render: createElement => {
    return createElement(App, {
      props: {
        "wwtNamespace": wwtEngineNamespace,
        "allowedOrigin": allowedOrigin,
      }
    });
  }
});
