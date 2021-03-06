import * as React from 'react';
import Popover from '@material-ui/core/Popover';
import { Theme, WithStyles, withStyles } from '@material-ui/core/styles';
import { Typography } from '@material-ui/core';

import { ValueProps } from './common';
import ValueView from './ValueView';

const styles = (theme: Theme) => ({
	popover: {
		'pointer-events': 'none',
	},
	paper: {
		'padding': theme.spacing.unit,
	},
});

interface ValuePopoverProps extends ValueProps {
	anchorEl: HTMLElement;
	onClose: () => void;
}

const ValuePopover = (props: ValuePopoverProps & WithStyles<typeof styles>) => (
	<Popover
		open
		onClose={props.onClose}
		anchorEl={props.anchorEl}
		anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
		transformOrigin={{ vertical: 'top', horizontal: 'left' }}
		className={props.classes.popover}
		classes={{ paper: props.classes.paper }}
		disableRestoreFocus
	>
		<Typography component="div">
			<ValueView type={props.type} value={props.value} accessible/>
		</Typography>
	</Popover>
);

export default withStyles(styles)(ValuePopover);
