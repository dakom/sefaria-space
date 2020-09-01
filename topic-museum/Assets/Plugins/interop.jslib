mergeInto(LibraryManager.library, {
  SetContext: function() {
    window._myExtensions.setContext(GLctx);
  },
  SetArtTexture: function (textureId, index, width, height) {
    window._myExtensions.setArtTexture(GL.textures[textureId], textureId, index, width, height);
  },
  SetTopicTexture: function (textureId, width, height) {
    window._myExtensions.setTopicTexture(GL.textures[textureId], width, height);
  },
  EnterTopicArea: function() {
    window._myExtensions.enterTopicArea();
  },
  ExitTopicArea: function() {
    window._myExtensions.exitTopicArea();
  },
  SelectTopicArea: function() {
    window._myExtensions.selectTopicArea();
  },
  EnterPersonArea: function() {
    window._myExtensions.enterPersonArea();
  },
  ExitPersonArea: function() {
    window._myExtensions.exitPersonArea();
  },
  SelectPersonArea: function() {
    window._myExtensions.selectPersonArea();
  },
  EnterArtArea: function(index) {
    window._myExtensions.enterArtArea(index);
  },
  ExitArtArea: function(index) {
    window._myExtensions.exitArtArea(index);
  },
  SelectArtArea: function(index) {
    window._myExtensions.selectArtArea(index);
  },
  EnterExitArea: function() {
    window._myExtensions.enterExitArea();
  },
  ExitExitArea: function() {
    window._myExtensions.exitExitArea();
  },
  SelectExitArea: function() {
    window._myExtensions.selectExitArea();
  },
});