/*global defineSuite*/
defineSuite([
         'Widgets/CameraButton/CameraButtonViewModel'
     ], function(
         CameraButtonViewModel) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor sets default values', function() {
        var viewModel = new CameraButtonViewModel();
        expect(viewModel.tooltip).toBeDefined();
        expect(viewModel.command).toBeDefined();
    });
});
