/*global define*/
define([
        '../Core/defined',
        '../Core/destroyObject'
    ], function(
        defined,
        destroyObject) {
    "use strict";

    /**
     * Manages the shaders used to shade the surface of a {@link CentralBody}.
     *
     * @alias CentralBodySurfaceShaderSet
     * @private
     */
    function CentralBodySurfaceShaderSet(attributeLocations) {
        this.baseVertexShaderString = undefined;
        this.baseFragmentShaderString = undefined;
        this._attributeLocations = attributeLocations;
        this._shaders = {};
    }

    CentralBodySurfaceShaderSet.prototype.invalidateShaders = function() {
        var shaders = this._shaders;
        for ( var keyword in shaders) {
            if (shaders.hasOwnProperty(keyword)) {
                shaders[keyword].release();
            }
        }

        this._shaders = {};
    };

    function getShaderKey(textureCount, applyBrightness, applyContrast, applyHue, applySaturation, applyGamma, applyAlpha) {
        var key = '';
        key += textureCount;

        if (applyBrightness) {
            key += '_brightness';
        }

        if (applyContrast) {
            key += '_contrast';
        }

        if (applyHue) {
            key += '_hue';
        }

        if (applySaturation) {
            key += '_saturation';
        }

        if (applyGamma) {
            key += '_gamma';
        }

        if (applyAlpha) {
            key += '_alpha';
        }

        return key;
    }

    CentralBodySurfaceShaderSet.prototype.getShaderProgram = function(context, textureCount, applyBrightness, applyContrast, applyHue, applySaturation, applyGamma, applyAlpha) {
        var key = getShaderKey(textureCount, applyBrightness, applyContrast, applyHue, applySaturation, applyGamma, applyAlpha);
        var shader = this._shaders[key];
        if (!defined(shader)) {
            var vs = this.baseVertexShaderString;
            var fs =
                (applyBrightness ? '#define APPLY_BRIGHTNESS\n' : '') +
                (applyContrast ? '#define APPLY_CONTRAST\n' : '') +
                (applyHue ? '#define APPLY_HUE\n' : '') +
                (applySaturation ? '#define APPLY_SATURATION\n' : '') +
                (applyGamma ? '#define APPLY_GAMMA\n' : '') +
                (applyAlpha ? '#define APPLY_ALPHA\n' : '') +
                '#define TEXTURE_UNITS ' + textureCount + '\n' +
                this.baseFragmentShaderString + '\n' +
                'vec3 computeDayColor(vec3 initialColor, vec2 textureCoordinates)\n' +
                '{\n' +
                '    vec3 color = initialColor;\n';

            for (var i = 0; i < textureCount; ++i) {
                fs +=
                    'color = sampleAndBlend(\n' +
                    '   color,\n' +
                    '   u_dayTextures[' + i + '],\n' +
                    '   textureCoordinates,\n' +
                    '   u_dayTextureTexCoordsExtent[' + i + '],\n' +
                    '   u_dayTextureTranslationAndScale[' + i + '],\n' +
                    (applyAlpha ?      '   u_dayTextureAlpha[' + i + '],\n' : '1.0,\n') +
                    (applyBrightness ? '   u_dayTextureBrightness[' + i + '],\n' : '0.0,\n') +
                    (applyContrast ?   '   u_dayTextureContrast[' + i + '],\n' : '0.0,\n') +
                    (applyHue ?        '   u_dayTextureHue[' + i + '],\n' : '0.0,\n') +
                    (applySaturation ? '   u_dayTextureSaturation[' + i + '],\n' : '0.0,\n') +
                    (applyGamma ?      '   u_dayTextureOneOverGamma[' + i + ']);\n' : '0.0);\n') ;
            }

            fs +=
                '    return color;\n' +
                '}';

            shader = context.shaderCache.getShaderProgram(vs, fs, this._attributeLocations);
            this._shaders[key] = shader;
        }
        return shader;
    };

    CentralBodySurfaceShaderSet.prototype.destroy = function() {
        this.invalidateShaders();
        return destroyObject(this);
    };

    return CentralBodySurfaceShaderSet;
});