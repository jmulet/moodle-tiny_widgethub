import { RawWidget } from "./src/options";

declare global {
  var Mocks = {
    editorFactory: (editorId?: number, userInfo?: Object, selection?: string) => any,
    loadWidget: (widgetName: 'bs-alert' | 'bs-badge') => RawWidget,
    modalSrv: import("/Users/josep/moodle-docker/moodle44/lib/editor/tiny/plugins/widgethub/tests/jsunit/src/service/modal_service").ModalSrv
    }
}
