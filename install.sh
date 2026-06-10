#!/bin/bash
# Install Tripo4AE to Adobe CEP extensions directory
EXT_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/com.tripo4ae.panel"
echo "Installing Tripo4AE to $EXT_DIR..."
rm -rf "$EXT_DIR"
ln -s "$(pwd)/dist/cep" "$EXT_DIR"
echo "Done. Symlink created."
echo ""
echo "If this is your first time, enable unsigned extensions:"
echo "  defaults write com.adobe.CSXS.12 PlayerDebugMode 1"
echo "  defaults write com.adobe.CSXS.11 PlayerDebugMode 1"
echo ""
echo "Then restart After Effects and open Window > Extensions > Tripo4AE"
