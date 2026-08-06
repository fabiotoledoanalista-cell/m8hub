import React, { useState, useRef, useEffect } from "react";

import Popover from "@material-ui/core/Popover";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import { makeStyles } from "@material-ui/core/styles";
import VolumeUpIcon from "@material-ui/icons/VolumeUp";
import VolumeDownIcon from "@material-ui/icons/VolumeDown";
import VolumeOffIcon from "@material-ui/icons/VolumeOff";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import RadioButtonUncheckedIcon from "@material-ui/icons/RadioButtonUnchecked";
import Typography from "@material-ui/core/Typography";
import Divider from "@material-ui/core/Divider";
import Switch from "@material-ui/core/Switch";
import FormControlLabel from "@material-ui/core/FormControlLabel";

import { Grid, Slider } from "@material-ui/core";
import { SOUND_OPTIONS } from "../../utils/notificationSounds";

const useStyles = makeStyles((theme) => ({
    tabContainer: {
        padding: theme.spacing(2),
    },
    popoverPaper: {
        width: "100%",
        maxWidth: 350,
        marginLeft: theme.spacing(2),
        marginRight: theme.spacing(1),
        [theme.breakpoints.down("sm")]: {
            maxWidth: 270,
        },
    },
    noShadow: {
        boxShadow: "none !important",
    },
    icons: {
        color: "#fff",
    },
    customBadge: {
        backgroundColor: "#f44336",
        color: "#fff",
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: theme.palette.text.secondary,
        marginBottom: theme.spacing(1),
    },
    soundList: {
        marginTop: theme.spacing(1),
    },
    soundItem: {
        borderRadius: 10,
        marginBottom: 4,
        paddingRight: theme.spacing(1),
        "&:hover": {
            backgroundColor: theme.palette.action.hover,
        },
    },
    playButton: {
        marginRight: theme.spacing(1),
    },
    selectedIcon: {
        color: theme.palette.primary.main,
        marginLeft: theme.spacing(1),
    },
}));

const NotificationsVolume = ({
    volume,
    setVolume,
    notificationSound,
    setNotificationSound,
    notificationMuted,
    setNotificationMuted,
}) => {
    const classes = useStyles();

    const anchorEl = useRef();
    const [isOpen, setIsOpen] = useState(false);
    const previewAudioRef = useRef(null);

    const handleClick = () => {
        setIsOpen((prevState) => !prevState);
    };

    const handleClickAway = () => {
        setIsOpen(false);
    };

    const handleVolumeChange = (value) => {
        const normalizedValue = Array.isArray(value) ? value[0] : value;
        setVolume(normalizedValue);
    };

    const handleSoundChange = (value) => {
        setNotificationSound(value);
    };

    const handlePreviewSound = (src) => {
        if (previewAudioRef.current) {
            previewAudioRef.current.pause();
            previewAudioRef.current.currentTime = 0;
        }

        const previewAudio = new Audio(src);
        const normalizedVolume = Number.isFinite(Number(volume))
            ? Math.min(1, Math.max(0, Number(volume)))
            : 1;
        previewAudio.volume = notificationMuted ? 0 : normalizedVolume;
        previewAudio.play().catch(() => null);
        previewAudioRef.current = previewAudio;
    };

    useEffect(() => {
        if (previewAudioRef.current) {
            const normalizedVolume = Number.isFinite(Number(volume))
                ? Math.min(1, Math.max(0, Number(volume)))
                : 1;
            previewAudioRef.current.volume = notificationMuted ? 0 : normalizedVolume;
        }
    }, [volume, notificationMuted]);

    useEffect(() => {
        return () => {
            if (previewAudioRef.current) {
                previewAudioRef.current.pause();
                previewAudioRef.current.currentTime = 0;
            }
        };
    }, []);

    return (
        <>
            <IconButton
                className={classes.icons}
                onClick={handleClick}
                ref={anchorEl}
                aria-label="Open Notifications"
                // color="inherit"
                // color="secondary"
            >
                {notificationMuted ? <VolumeOffIcon color="inherit" /> : <VolumeUpIcon color="inherit" />}
            </IconButton>
            <Popover
                disableScrollLock
                open={isOpen}
                anchorEl={anchorEl.current}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right",
                }}
                transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                }}
                classes={{ paper: classes.popoverPaper }}
                onClose={handleClickAway}
            >
                <List dense className={classes.tabContainer}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={notificationMuted}
                                onChange={(e) => setNotificationMuted(e.target.checked)}
                                color="primary"
                            />
                        }
                        label="Silenciar notificações"
                    />
                    <Grid container spacing={2}>
                        <Grid item>
                            <VolumeDownIcon />
                        </Grid>
                        <Grid item xs>
                            <Slider
                                value={Number(volume)}
                                aria-labelledby="continuous-slider"
                                step={0.1}
                                min={0}
                                max={1}
                                onChange={(e, value) =>
                                    handleVolumeChange(value)
                                }
                            />
                        </Grid>
                        <Grid item>
                            <VolumeUpIcon />
                        </Grid>
                    </Grid>
                    <Divider style={{ margin: "12px 0" }} />
                    <Typography className={classes.sectionTitle}>
                        Som da notificação
                    </Typography>
                    <List dense className={classes.soundList}>
                        {SOUND_OPTIONS.map((option) => {
                            const selected = option.id === notificationSound;
                            return (
                                <ListItem
                                    key={option.id}
                                    button
                                    onClick={() => handleSoundChange(option.id)}
                                    className={classes.soundItem}
                                >
                                    <IconButton
                                        edge="start"
                                        size="small"
                                        className={classes.playButton}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handlePreviewSound(option.src);
                                        }}
                                        aria-label={`Ouvir ${option.label}`}
                                    >
                                        <PlayArrowIcon fontSize="small" />
                                    </IconButton>
                                    <ListItemText primary={option.label} />
                                    {selected ? (
                                        <CheckCircleOutlineIcon
                                            fontSize="small"
                                            className={classes.selectedIcon}
                                        />
                                    ) : (
                                        <RadioButtonUncheckedIcon fontSize="small" />
                                    )}
                                </ListItem>
                            );
                        })}
                    </List>
                </List>
            </Popover>
        </>
    );
};

export default NotificationsVolume;
