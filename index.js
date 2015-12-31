/* jshint node: true */
'use strict';

var Promise   = require('ember-cli/lib/ext/promise');
var minimatch = require('minimatch');
var DeployPluginBase = require('ember-cli-deploy-plugin');
var S3             = require('./lib/s3');

var EXPIRE_IN_2030               = new Date('2030');
var TWO_YEAR_CACHE_PERIOD_IN_SEC = 60 * 60 * 24 * 365 * 2;

var defaultCacheControl = 'max-age='+TWO_YEAR_CACHE_PERIOD_IN_SEC+', public';
var defaultExpires = EXPIRE_IN_2030;

module.exports = {
  name: 'ember-cli-deploy-s3',

  createDeployPlugin: function(options) {
    var DeployPlugin = DeployPluginBase.extend({
      name: options.name,
      defaultConfig: {
        filePattern: '**/*.{js,css,png,gif,ico,jpg,map,xml,txt,svg,swf,eot,ttf,woff,woff2}',
        prefix: '',
        acl: 'public-read',
        cacheControl: defaultCacheControl,
        expires: defaultExpires,
        distDir: function(context) {
          return context.distDir;
        },
        distFiles: function(context) {
          return context.distFiles || [];
        },
        gzippedFiles: function(context) {
          return context.gzippedFiles || []; // e.g. from ember-cli-deploy-gzip
        },
        manifestPath: function(context) {
          return context.manifestPath; // e.g. from ember-cli-deploy-manifest
        },
        uploadClient: function(context) {
          return context.uploadClient; // if you want to provide your own upload client to be used instead of one from this plugin
        },
        s3Client: function(context) {
          return context.s3Client; // if you want to provide your own S3 client to be used instead of one from aws-sdk
        }
      },
      requiredConfig: ['bucket', 'region'],

      upload: function(context) {
        var self         = this;

        var filePattern   = this.readConfig('filePattern');
        var distDir       = this.readConfig('distDir');
        var distFiles     = this.readConfig('distFiles');
        var gzippedFiles  = this.readConfig('gzippedFiles');
        var bucket        = this.readConfig('bucket');
        var acl           = this.readConfig('acl');
        var prefix        = this.readConfig('prefix');
        var manifestPath  = this.readConfig('manifestPath');

        var filesToUpload = distFiles.filter(minimatch.filter(filePattern, { matchBase: true }));

        var s3 = this.readConfig('uploadClient') || new S3({
          plugin: this
        });

        var options = {
          cwd: distDir,
          filePaths: filesToUpload,
          gzippedFilePaths: gzippedFiles,
          prefix: prefix,
          bucket: bucket,
          acl: acl,
          manifestPath: manifestPath
        };

        this.log('preparing to upload to S3 bucket `' + bucket + '`', { verbose: true });

        return s3.upload(options)
        .then(function(filesUploaded){
          self.log('uploaded ' + filesUploaded.length + ' files ok', { verbose: true });
          return { filesUploaded: filesUploaded };
        })
        .catch(this._errorMessage.bind(this));
      },
      _errorMessage: function(error) {
        this.log(error, { color: 'red' });
        if (error) {
          this.log(error.stack, { color: 'red' });
        }
        return Promise.reject(error);
      }
    });
    return new DeployPlugin();
  }
};
