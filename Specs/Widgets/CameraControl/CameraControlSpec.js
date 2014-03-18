/*global defineSuite*/
defineSuite([
         'Widgets/CameraControl/CameraControl',
         'Core/Ellipsoid',
         'Scene/SceneTransitioner',
         'Specs/createScene',
         'Specs/destroyScene'
     ], function(
         CameraControl,
         Ellipsoid,
         SceneTransitioner,
         createScene,
         destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor sets expected values', function() {
        var testElement = document.createElement('span');
        var cameraControl = new CameraControl(testElement);
        expect(cameraControl.container).toBe(testElement);
        expect(cameraControl.viewModel).toBeDefined();
        expect(cameraControl.isDestroyed()).toEqual(false);
        cameraControl.destroy();
        expect(cameraControl.isDestroyed()).toEqual(true);
    });

    it('constructor works with string id container', function() {
        var testElement = document.createElement('span');
        testElement.id = 'testElement';
        document.body.appendChild(testElement);
        var cameraControl = new CameraControl('testElement');
        expect(cameraControl.container).toBe(testElement);
        document.body.removeChild(testElement);
        cameraControl.destroy();
    });

    it('throws if container is undefined', function() {
        expect(function() {
            return new CameraControl(undefined);
        }).toThrowDeveloperError();
    });

    it('throws if container string is undefined', function() {
        expect(function() {
            return new CameraControl('testElement');
        }).toThrowDeveloperError();
    });
});