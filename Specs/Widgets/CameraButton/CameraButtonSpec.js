/*global defineSuite*/
defineSuite([
         'Widgets/CameraButton/CameraButton'
     ], function(
         CameraButton) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor sets default values', function() {
        var cameraButton = new CameraButton(document.body);
        expect(cameraButton.container).toBe(document.body);
        expect(cameraButton.isDestroyed()).toEqual(false);
        cameraButton.destroy();
        expect(cameraButton.isDestroyed()).toEqual(true);
    });

    it('constructor sets expected values', function() {
        var cameraButton = new CameraButton(document.body);
        expect(cameraButton.container).toBe(document.body);
        cameraButton.destroy();
    });

    it('constructor works with string id container', function() {
        var testElement = document.createElement('span');
        testElement.id = 'testElement';
        document.body.appendChild(testElement);
        var cameraButton = new CameraButton('testElement');
        expect(cameraButton.container).toBe(testElement);
        document.body.removeChild(testElement);
        cameraButton.destroy();
    });

    it('throws if container is undefined', function() {
        expect(function() {
            return new CameraButton(undefined);
        }).toThrowDeveloperError();
    });

    it('throws if container string is undefined', function() {
        expect(function() {
            return new CameraButton('testElement');
        }).toThrowDeveloperError();
    });
});
