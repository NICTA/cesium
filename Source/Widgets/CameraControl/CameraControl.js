/*global define*/
define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/destroyObject',
        '../getElement',
        './CameraControlViewModel',
        '../../ThirdParty/knockout'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        destroyObject,
        getElement,
        CameraControlViewModel,
        knockout) {
    "use strict";

    /**
     * A widget for setting camera options.
     *
     * @alias CameraControl
     * @constructor
     *
     * @param {Element|String} container The DOM element or ID that will contain the widget.
     *
     * @exception {DeveloperError} Element with id "container" does not exist in the document.
     */
    var CameraControl = function(container) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(container)) {
            throw new DeveloperError('container is required.');
        }
        //>>includeEnd('debug')

        container = getElement(container);

        this._container = container;

        var element = document.createElement('div');
        element.className = 'cesium-cameraControl';
        element.setAttribute('data-bind', '\
css: { "cesium-cameraControl-visible" : show }');
        container.appendChild(element);
        this._element = element;

        var titleElement = document.createElement('div');
        titleElement.className = 'cesium-cameraControl-title';
        titleElement.textContent = 'Camera Control';
        element.appendChild(titleElement);

        /*
        var cameraElement = document.createElement('button');
        cameraElement.type = 'button';
        cameraElement.className = 'cesium-button cesium-cameraControl-camera';
        cameraElement.setAttribute('data-bind', '\
attr: { title: "Focus camera on object" },\
click: function () { cameraClicked.raiseEvent(); },\
enable: enableCamera,\
cesiumSvgPath: { path: cameraIconPath, width: 32, height: 32 }');
        element.appendChild(cameraElement);
        */

        var closeElement = document.createElement('button');
        closeElement.type = 'button';
        closeElement.className = 'cesium-cameraControl-close';
        closeElement.setAttribute('data-bind', '\
click: function () { closeClicked.raiseEvent(); }');
        closeElement.innerHTML = '&times;';
        element.appendChild(closeElement);

        var infoBodyElement = document.createElement('div');
        infoBodyElement.className = 'cesium-cameraControl-body';
        element.appendChild(infoBodyElement);

        var descriptionElement = document.createElement('div');
        descriptionElement.className = 'cesium-cameraControl-description';
        descriptionElement.setAttribute('data-bind', '\
html: descriptionSanitizedHtml,\
style : { maxHeight : maxHeightOffset(40) }');
        infoBodyElement.appendChild(descriptionElement);

        var viewModel = new CameraControlViewModel();
        this._viewModel = viewModel;

        knockout.applyBindings(this._viewModel, element);
    };

    defineProperties(CameraControl.prototype, {
        /**
         * Gets the parent container.
         * @memberof CameraControl.prototype
         *
         * @type {Element}
         */
        container : {
            get : function() {
                return this._container;
            }
        },

        /**
         * Gets the view model.
         * @memberof CameraControl.prototype
         *
         * @type {SelectionIndicatorViewModel}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    /**
     * @memberof CameraControl
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    CameraControl.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof CameraControl
     */
    CameraControl.prototype.destroy = function() {
        var container = this._container;
        knockout.cleanNode(this._element);
        container.removeChild(this._element);
        return destroyObject(this);
    };

    return CameraControl;
});