/*global define*/
define([
        '../../Core/defineProperties',
        '../createCommand',
        '../../ThirdParty/knockout'
    ], function(
        defineProperties,
        createCommand,
        knockout) {
    "use strict";

    /**
     * The view model for {@link CameraButton}.
     * @alias CameraButtonViewModel
     * @constructor
     */
    var CameraButtonViewModel = function() {
        this._command = createCommand(function() { });

        /**
         * Gets or sets the tooltip.  This property is observable.
         *
         * @type {String}
         */
        this.tooltip = 'Camera options...';

        knockout.track(this, ['tooltip']);
    };

    defineProperties(CameraButtonViewModel.prototype, {
        /**
         * Gets the Command that is executed when the button is clicked.
         * @memberof CameraButtonViewModel.prototype
         *
         * @type {Command}
         */
        command : {
            get : function() {
                return this._command;
            }
        }
    });

    return CameraButtonViewModel;
});
