local keyboardAliases = {
  shift: 'shiftButton',
  backspace: 'backspaceButton',
  cnen: 'cnenButton',
  '123': '123Button',
  space: 'spaceButton',
  spaceRight: 'spaceRightButton',
  enter: 'enterButton',
};

local numericAliases = {
  collection: 'collection',
  return: 'returnButton',
  symbol: 'symbolButton',
  space: 'spaceButton',
  equal: 'equalButton',
  period: 'periodButton',
  backspace: 'backspaceButton',
  enter: 'enterButton',
};
local numericDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

local symbolicAliases = {
  category: 'categoryCollection',
  description: 'descriptionCollection',
  return: 'symbolreturnButton',
  pageUp: 'pageUpButton',
  pageDown: 'pageDownButton',
  lock: 'lockButton',
  backspace: 'symbolbackspaceButton',
};

local resolveKeyboardCell(key) =
  if std.objectHas(keyboardAliases, key) then
    keyboardAliases[key]
  else
    key + 'Button';

local resolveNumericCell(key) =
  if std.objectHas(numericAliases, key) then
    numericAliases[key]
  else if std.member(numericDigits, key) then
    'number' + key + 'Button'
  else
    key + 'Button';

local resolveSymbolicCell(key) =
  if std.objectHas(symbolicAliases, key) then
    symbolicAliases[key]
  else
    key + 'Button';

local renderCell(cellName) = { Cell: cellName };

local renderRow(cells, resolver, style=null) =
  {
    HStack: std.prune({
      style: style,
      subviews: [renderCell(resolver(key)) for key in cells],
    }),
  };

local renderColumn(cells, resolver, style=null) =
  {
    VStack: std.prune({
      style: style,
      subviews: [renderCell(resolver(key)) for key in cells],
    }),
  };

{
  resolveKeyboardCell: resolveKeyboardCell,
  resolveNumericCell: resolveNumericCell,
  resolveSymbolicCell: resolveSymbolicCell,
  renderCell: renderCell,
  renderRow: renderRow,
  renderColumn: renderColumn,
}
